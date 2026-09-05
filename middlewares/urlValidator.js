function validarUrlMiddleware(req, res, next) {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const parsedUrl = new URL(url);
        
        // Block dangerous protocols (file://, ftp://, etc.)
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return res.status(400).json({ error: 'Solo se permiten protocolos HTTP o HTTPS.' });
        }

        req.body.url = parsedUrl.href; 
        next();
    } catch (error) {
        return res.status(400).json({ error: 'El formato de la URL no es válido.' });
    }
}

module.exports = validarUrlMiddleware;