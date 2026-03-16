import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

const sql = DATABASE_URL
  ? postgres(DATABASE_URL, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {}, // Supabase notices 무시
    })
  : new Proxy({} as ReturnType<typeof postgres>, {
      get() {
        throw new Error(
          "DATABASE_URL is not set. Please configure the PostgreSQL database connection."
        );
      },
      apply() {
        throw new Error(
          "DATABASE_URL is not set. Please configure the PostgreSQL database connection."
        );
      },
    });

export { sql };
