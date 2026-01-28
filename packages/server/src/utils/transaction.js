import mongoose from 'mongoose';

/**
 * Executes a function within a MongoDB transaction if supported.
 * Falls back to normal execution if the database is standalone.
 *
 * @param {Function} work - Async function to execute. Receives the session object.
 * @returns {Promise<any>} Result of the work function.
 */
export const runInTransaction = async (work) => {
  // Check if transactions are supported (requires replica set)
  // We can check the connection's topology or simply try/catch the session start
  // but a more reliable way in Mongoose is to check the replicaSet property
  // or use a flag.

  // For local development robustness, we'll check the connection string components
  // or try to start a session and handle the specific error.

  const conn = mongoose.connection;
  const isReplicaSet =
    conn.client.topology &&
    (conn.client.topology.type === 'ReplicaSetNoPrimary' ||
      conn.client.topology.type === 'ReplicaSetWithPrimary' ||
      conn.client.topology.description?.type?.includes('ReplicaSet'));

  // If not a replica set, just run the work without a session
  if (!isReplicaSet && process.env.NODE_ENV !== 'production') {
    // console.warn(
    //   '⚠️ [DB] Standalone MongoDB detected. Running without transaction.'
    // );
    return await work(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
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
