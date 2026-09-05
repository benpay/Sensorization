const revokedTokens = new Map();

const revokeToken = (token, expiredAt) => {
    revokedTokens.set(token, expiredAt);
};

const isTokenRevoked = (token) => {
    const expiredAt = revokedTokens.get(token);

    if (!expiredAt) {
        return false; // Token aún válido
    }

    if (Date.now() >= expiredAt) {
        revokedTokens.delete(token); // Eliminar token revocado si ha expirado
        return false; 
    }
    return true; // Token aún válido
};

module.exports = { revokeToken, isTokenRevoked };