// tests/setup.js
afterAll(async () => {
  try {
    const { pool } = await import('../src/db/client.js')
    await pool.end()
  } catch (err) {
    // Only ignore module-not-found errors (db not initialized yet)
    if (!err.message?.includes('Cannot find module') && err.code !== 'ERR_MODULE_NOT_FOUND') {
      throw err
    }
  }
})
