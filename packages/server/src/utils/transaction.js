import mongoose from 'mongoose';

const hasReplicaSetTopology = () => {
  const topology = mongoose.connection.client?.topology;

  return Boolean(
    topology &&
      (topology.type === 'ReplicaSetNoPrimary' ||
        topology.type === 'ReplicaSetWithPrimary' ||
        topology.description?.type?.includes('ReplicaSet'))
  );
};

/**
 * Executes a function within a MongoDB transaction if supported.
 * Falls back to normal execution if the database is standalone.
 *
 * @param {Function} work - Async function to execute. Receives the session object.
 * @param {Object} [options] - Transaction execution options.
 * @param {boolean} [options.requireReplicaSet=false] - Throw instead of falling back when transactions are unavailable.
 * @returns {Promise<any>} Result of the work function.
 */
export const runInTransaction = async (
  work,
  { requireReplicaSet = false } = {}
) => {
  const isReplicaSet = hasReplicaSetTopology();

  if (!isReplicaSet) {
    const message =
      'MongoDB replica set is required for this transactional workflow.';

    if (requireReplicaSet || process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }

    return await work(null);
  }

  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Safely adds a session to a query if the session exists.
 * Helps in writing session-neutral code.
 *
 * @param {mongoose.Query|mongoose.Aggregate} query - Mongoose Query or Aggregate object
 * @param {mongoose.ClientSession|null} session - The session object
 * @returns {mongoose.Query|mongoose.Aggregate} The updated query/aggregate
 */
export const withSession = (query, session) => {
  if (session) {
    return query.session(session);
  }
  return query;
};
