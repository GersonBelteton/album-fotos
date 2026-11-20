
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLOUDINARY_FOLDER = 'mi-aplicacion/fotos';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Método no permitido'
        });
    }

    const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
    const apiKey = process.env['CLOUDINARY_API_KEY'];
    const apiSecret = process.env['CLOUDINARY_API_SECRET'];


    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({
            error: 'Faltan las credenciales de Cloudinary'
        });
    }

    const maxResults = 100;
    const nextCursor =
        typeof req.query['next_cursor'] === 'string'
            ? req.query['next_cursor']
            : undefined;

    const credentials = Buffer
        .from(`${apiKey}:${apiSecret}`)
        .toString('base64');

    const headers = {
        Authorization: `Basic ${credentials}`
    };

    try {
        const params = new URLSearchParams({
            asset_folder: CLOUDINARY_FOLDER,
            max_results: String(maxResults),
            direction: 'desc'
        });

        if (nextCursor) {
            params.set('next_cursor', nextCursor);
        }

        // Primero intenta consultar mediante carpetas dinámicas.
        let cloudinaryResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/resources/by_asset_folder?${params}`,
            { headers }
        );

        // Si la cuenta utiliza carpetas legacy (fixed folders),
        // consulta mediante el prefijo del public_id.
        if (cloudinaryResponse.status === 404) {
            const legacyParams = new URLSearchParams({
                prefix: `${CLOUDINARY_FOLDER}/`,
                max_results: String(maxResults)
            });

            if (nextCursor) {
                legacyParams.set('next_cursor', nextCursor);
            }

            cloudinaryResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?${legacyParams}`,
                { headers }
            );
        }

        if (!cloudinaryResponse.ok) {
            console.error(
                'Cloudinary respondió:',
                cloudinaryResponse.status,
                await cloudinaryResponse.text()
            );

            return res.status(502).json({
                error: 'No fue posible consultar las fotografías'
            });
        }

        const data = await cloudinaryResponse.json();

        const fotos = (data.resources || [])
            .filter((foto: any) => foto.secure_url)
            .map((foto: any) => ({
                public_id: foto.public_id,
                secure_url: foto.secure_url,
                created_at: foto.created_at
            }));

        res.setHeader(
            'Cache-Control',
            's-maxage=60, stale-while-revalidate=300'
        );

        return res.status(200).json({
            fotos,
            next_cursor: data.next_cursor || null
        });

    } catch (error) {
        console.error('Error consultando Cloudinary:', error);

        return res.status(500).json({
            error: 'Error interno al obtener las fotografías'
        });
    }
}
