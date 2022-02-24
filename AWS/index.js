require('dotenv').config();
const mysql = require('mysql2');
const { database } = require('./keys');
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets'
});
const spreadsheetId = process.env.SPREADSHEET_ID;


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
        async function obtenerPrecioActual(tabla, hoja){
            try {
                var sql = `SELECT * FROM ${tabla}`;
                conexion.query(sql, function (err, resultado) {
                    if (err) throw err;
                    JSON.stringify(resultado);
                    trasladarPrecioActual(resultado, hoja);
                });
            } catch (error) {
                console.error(error);
            }
        };
        
        async function trasladarPrecioActual(resultado, hoja){
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
                console.log(datos);
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