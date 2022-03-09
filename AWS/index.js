require('dotenv').config();
const mysql = require('mysql2');
const { database } = require('./keys');
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets'
});

exports.handler = async function (event) {
    const promise = new Promise(async function() {
        const conexion = mysql.createConnection({
            host: database.host,
            user: database.user,
            password: database.password,
            port: database.port,
            database: database.database
        });
        const client = await auth.getClient();
        const googleSheet = google.sheets({ version: 'v4', auth: client });
        await obtenerPrecioActual(process.env.TABLE_CRIPTO_PRICE, process.env.ID_HOJA_RANGO);
        await finalizarEjecucion();
        async function obtenerPrecioActual(tabla, hoja, spreadsheetId){
            try {
                const spreadsheetId1 = process.env.SPREADSHEET_ID_CP1;
                const spreadsheetId2 = process.env.SPREADSHEET_ID_CP2;
                const spreadsheetId3 = process.env.SPREADSHEET_ID_CP3;
                var fecha = new Date();
                var mes = fecha.getMonth() + 1;
                var fechaActual = `${fecha.getFullYear()}-${mes}-${fecha.getDate()}`;
                var sql = `SELECT * FROM ${tabla} WHERE fecha = '${fechaActual}'`;
                conexion.query(sql, async function (err, resultado) {
                    if (err) throw err;
                    console.log('Conexion establecida con la base de datos');
                    JSON.stringify(resultado);
                    trasladarPrecioActual(resultado, hoja, spreadsheetId1);
                    await trasladarPrecioActual(resultado, hoja, spreadsheetId2);
                    await trasladarPrecioActual(resultado, hoja, spreadsheetId3);
                });
            } catch (error) {
                console.error(error);
            }
        };
        
        async function trasladarPrecioActual(resultado, hoja, spreadsheetId){
            try {
                var datos = [];
                await googleSheet.spreadsheets.values.clear({
                    auth,
                    spreadsheetId,
                    range: `${hoja}`
                });
                for (let i = 0; i < resultado.length; i++) {
                    datos.push([resultado[i].name, resultado[i].fecha, resultado[i].precio]);
                }
                await googleSheet.spreadsheets.values.append({
                    auth,
                    spreadsheetId,
                    range: `${hoja}`,
                    valueInputOption: "USER_ENTERED",
                    requestBody: {
                        "range": `${hoja}`,
                        "values": datos
                    }
                });
                console.log('Datos agregados correctamente.');
            } catch (error) {
                console.error(error);
            }
        };
        async function finalizarEjecucion() {
            conexion.end();
        }
    });
    return promise;
};