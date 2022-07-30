require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mysql = require('mysql2');
const { database } = require('./keys');
const PUERTO = 4300;
const app = express();
const admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./credentials-fb.json");

initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();

app.use(morgan('dev'));

app.get('/', async (req, res) => {
    const conexion = mysql.createConnection({
        host: database.host,
        user: database.user,
        password: database.password,
        port: database.port,
        database: database.database
    });
    await obtenerPrecioActual(process.env.TABLE_CRIPTO_PRICE);
    await finalizarEjecucion();
    async function obtenerPrecioActual(tabla, hoja, spreadsheetId){
        try {
            var fecha = new Date();
            var mes = fecha.getMonth() + 1;
            var fechaActual = `${fecha.getFullYear()}-${mes}-${fecha.getDate()}`;
            var sql = `SELECT * FROM ${tabla} WHERE fecha = '${fechaActual}'`;
            conexion.query(sql, async function (err, resultado) {
                if (err) throw err;
                console.log('Conexion establecida con la base de datos');
                JSON.stringify(resultado);
                trasladarPrecioActual(resultado);
            });
        } catch (error) {
            console.error(error);
        }
    };
    
    async function trasladarPrecioActual(resultado){
        try {
            const querySnapshot = await db.collection('precio_criptos_actual').get();
            const datos = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            var exist = false;
            var contador = 1;
            for (let i = 0; i < resultado.length; i++) {
                const element = resultado[i];
                for (let j = 0; j < datos.length; j++) {
                    const data = datos[j];
                    if (element.name == data.name) {
                        exist = true;
                        var identificacion = data.id;
                        break;
                    }
                }
                if (exist) {
                    await db.collection('precio_criptos_actual').doc(identificacion).update({
                        fecha: element.fecha,
                        precio: element.precio
                    })
                } else {
                    await db.collection('precio_criptos_actual').add({
                        fecha: element.fecha,
                        name: element.name,
                        precio: element.precio
                    });
                }
                exist = false;
                contador++;
            }
        } catch (error) {
            console.error(error);
        }
    };
    async function finalizarEjecucion() {
        conexion.end();
        res.send("Ejecutado");
    }
});

app.listen(process.env.PORT || PUERTO, () => {
    console.log(`Escuchando en puerto ${process.env.PORT || PUERTO}`);
});