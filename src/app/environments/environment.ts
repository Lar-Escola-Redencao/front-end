export const environment = {
  production: false,
  // Vazio de propósito: o `ng serve` local usa o proxy definido em proxy.conf.json
  // para encaminhar as chamadas até http://localhost:8080, evitando bloqueio de CORS
  // (a branch atual do back-end ainda não tem CORS configurado).
  apiUrl: ''
};
