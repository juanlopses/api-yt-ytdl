const express = require('express');
const { yts, ytmp3, ytmp4 } = require('@hiudyy/ytdl');
const axios = require('axios');
const FormData = require('form-data');
const app = express();
const port = 3000;

app.use(express.json());

// Función para subir archivo a tmpfiles.org
async function uploadToTmpFiles(buffer, filename, mimeType) {
    try {
        const form = new FormData();
        form.append('file', buffer, {
            filename: filename,
            contentType: mimeType
        });

        const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders()
        });

        // Verificar que la respuesta tenga la estructura esperada
        if (response.data.status !== 'success' || !response.data.data?.url) {
            throw new Error('Respuesta inválida de tmpfiles.org');
        }

        // Transformar la URL para incluir /dl
        let url = response.data.data.url;
        url = url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
        return url; // Retorna la URL en formato https://tmpfiles.org/dl/<id>/<filename>
    } catch (error) {
        console.error('Error al subir a tmpfiles.org:', error.message);
        throw error;
    }
}

// Endpoint /play - Devuelve información del audio MP3
app.get('/play', async (req, res) => {
    try {
        const consulta = req.query.q;
        if (!consulta) {
            return res.status(400).json({ error: 'El parámetro de consulta "q" es obligatorio' });
        }

        // Buscar el primer video usando yts
        const resultadoBusqueda = await yts(consulta);
        const video = resultadoBusqueda.videos[0];
        if (!video) {
            return res.status(404).json({ error: 'No se encontró ningún video para la consulta' });
        }

        // Descargar audio usando ytmp3
        const audioBuffer = await ytmp3(`https://www.youtube.com/watch?v=${video.id}`);

        // Subir a tmpfiles.org
        const urlArchivo = await uploadToTmpFiles(
            audioBuffer,
            `${video.title.text.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`, // Limpiar nombre de archivo
            'audio/mpeg'
        );

        // Responder con información en español, incluyendo la URL de la imagen
        res.json({
            título: video.title.text,
            duración: video.thumbnail_overlays[0].text,
            url_youtube: `https://www.youtube.com/watch?v=${video.id}`,
            url_descarga: urlArchivo,
            img: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
        });
    } catch (error) {
        console.error('Error en /play:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint /play2 - Devuelve información del video MP4
app.get('/play2', async (req, res) => {
    try {
        const consulta = req.query.q;
        if (!consulta) {
            return res.status(400).json({ error: 'El parámetro de consulta "q" es obligatorio' });
        }

        // Buscar el primer video usando yts
        const resultadoBusqueda = await yts(consulta);
        const video = resultadoBusqueda.videos[0];
        if (!video) {
            return res.status(404).json({ error: 'No se encontró ningún video para la consulta' });
        }

        // Descargar video usando ytmp4
        const videoBuffer = await ytmp4(`https://www.youtube.com/watch?v=${video.id}`);

        // Subir a tmpfiles.org
        const urlArchivo = await uploadToTmpFiles(
            videoBuffer,
            `${video.title.text.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`, // Limpiar nombre de archivo
            'video/mp4'
        );

        // Responder con información en español, incluyendo la URL de la imagen
        res.json({
            título: video.title.text,
            duración: video.thumbnail_overlays[0].text,
            url_youtube: `https://www.youtube.com/watch?v=${video.id}`,
            url_descarga: urlArchivo,
            img: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
        });
    } catch (error) {
        console.error('Error en /play2:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
