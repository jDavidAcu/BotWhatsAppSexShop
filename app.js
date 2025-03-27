const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const axios = require('axios');

// Función para obtener todos los productos de la API
const obtenerProductos = async () => {
    try {
        const response = await axios.get('http://sexshop.runasp.net/api/Producto');
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        return [];
    }
};

// Nuevo flujo hijo para buscar producto específico
const flowBusquedaEspecifica = addKeyword(['necesito', 'busco'])
    .addAction(async (msg, { flowDynamic }) => {
        const query = msg.body.toLowerCase().split(' ').slice(1).join(' '); // Captura la búsqueda después de "necesito" o "busco"
        const productos = await obtenerProductos();
        const productoEncontrado = productos.find(p => 
            p.PRD_DESC.toLowerCase().includes(query) || p.PRD_NOMBRE.toLowerCase().includes(query)
        );

        if (!productoEncontrado) {
            await flowDynamic('❌ No encontré ningún producto que coincida con tu búsqueda.');
        } else {
            await flowDynamic([ 
                `🛒 *${productoEncontrado.PRD_NOMBRE}*`,
                `💬 ${productoEncontrado.PRD_DESC}`,
                `💰 Precio: $${productoEncontrado.PRD_PRECIO}`,
                `📦 Stock: ${productoEncontrado.PRD_STOCK}`,
                `🖼️ Imagen: ${productoEncontrado.PRD_IMAGEN}`
            ]);
        }
    });

// Flujo de búsqueda general
const flowBusqueda = addKeyword(['buscar', 'quiero', 'productos'])
    .addAction(async (_, { flowDynamic }) => {
        const productos = await obtenerProductos();

        if (productos.length === 0) {
            await flowDynamic('❌ No hay productos disponibles en este momento.');
        } else {
            await flowDynamic('🛍 Aquí tienes nuestros productos disponibles:');
            for (const producto of productos.slice(0, 5)) {
                await flowDynamic([
                    `🛒 *${producto.PRD_NOMBRE}*`,
                    `💬 ${producto.PRD_DESC}`,
                    `💰 Precio: $${producto.PRD_PRECIO}`,
                    `📦 Stock: ${producto.PRD_STOCK}`,
                    `🖼️ Imagen: ${producto.PRD_IMAGEN}`
                ]);
            }
        }
    });

// Flujo de bienvenida
const flowBienvenida = addKeyword(['hola', 'buenas', 'saludos'])
    .addAnswer('🙌 ¡Hola! Bienvenido a nuestra tienda.')
    .addAnswer('Escribe productos para ver todo nuestro catálogo o "necesito [producto]" para buscar algo específico.', null, null, [flowBusqueda, flowBusquedaEspecifica]);

// Función principal
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowBienvenida, flowBusqueda, flowBusquedaEspecifica]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();