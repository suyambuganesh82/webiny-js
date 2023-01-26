exports.handler = async (...args) => {
    try {
        const { handler } = require("./_handler");
        return handler(...args);
    } catch (e) {
        console.error(e)
        return {
            statusCode: 500,
            headers: {
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({
                code: "UNCAUGHT_ERROR",
                message: e.message,
                data: e.data || null
            })
        };
    }
};
