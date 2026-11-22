const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Datos de prueba (simulan la tabla "users")
const users = [{ username: "jgarcia", password: "1234" }];

// Configuración de la simulación
const QUERY_TIME_MS = 200; // consulta optimizada (se restaura el rendimiento anterior)
const MAX_WAIT_MS = 6000;   // el módulo de autenticación solo espera 6 s
const MAX_ERRORS = 3;       // tras 3 errores internos el servicio responde 500
let internalErrors = 0;

function log(level, text) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`${now} ${level} ${text}`);
}

// Simula la consulta a la tabla "users"
function findUser(username) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (QUERY_TIME_MS > MAX_WAIT_MS) {
        return reject(new Error('Timeout while querying table "users"'));
      }
      resolve(users.find((u) => u.username === username));
    }, Math.min(QUERY_TIME_MS, MAX_WAIT_MS));
  });
}

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (internalErrors >= MAX_ERRORS) {
    log("ERROR", "AuthService - Error validating user token");
    return res.status(500).json({ message: "Error interno del servidor" });
  }

  try {
    const user = await findUser(username);
    if (user && user.password === password) {
      return res.json({ message: "Login exitoso" });
    }
    return res
      .status(401)
      .json({ message: "Error: credenciales no válidas. Inténtelo nuevamente." });
  } catch (err) {
    internalErrors++;
    log("ERROR", "AuthService - Error validating user token");
    log("WARN", `AuthController - Login attempt failed for user: ${username}`);
    log("ERROR", `DBConnection - ${err.message}`);
        // Un error interno ya no se muestra como "credenciales no válidas"
        return res
        .status(503)
        .json({ message: "Servicio no disponible. Inténtelo más tarde." });
  }
});

app.listen(3000, () => console.log("Servidor en http://localhost:3000"));
