const express = require('express');
const {Pool} = require('pg');

const app = express();
const port = 3001;

app.use(express.json());
app.listen(port, () => console.log('Listening on port ' + port));   

const pool = new Pool({ 
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'Calila00123',
    port: 5432,
});

pool.connect((error) =>{ 
    if(error) throw error;
    console.log('Connected to database')
});

app.get('/joyas', async (req, res) => {
    try{
        const {limits, page, order_by} = req.query; // req.query es un objeto con los parametros de la url
        let orderByClause = '';
        if(order_by){
            // separar por guion bajo el campo y la direccion
            const [column, direction] = order_by.split('_'); 
            orderByClause = `ORDER BY ${column} ${direction}`;
        }
        const limit = parseInt(limits) || 10; // como los valores de la url son string, se convierten a int
        const offSet = (parseInt(page) - 1) * limit || 0; // esto es para la paginacion, si no hay pagina, se pone 0
        
        const client = await pool.connect();

        //result es un objeto con los registros de la tabla que se obtienen de la base de datos
        const result = await client.query(`
            SELECT * FROM inventario
            ${orderByClause} 
            LIMIT $1 OFFSET $2
            `
        ,[limit, offSet]) ;

        // consulta que nos trae el stock de los registros de la tabla
        const stockResult = await client.query(`
            SELECT SUM(stock) AS total FROM inventario
        `);
        console.log(stockResult);
        const stockTotal = stockResult.rows[0].total; // se obtiene el total de la consulta anterior
        console.log(stockTotal);

        const response = {
            totaljoyas: result.rowCount,
            stockTotal,
            results: result.rows.map(joyas => ({
                id: joyas.id,
                nombre: joyas.nombre,
                stock: joyas.stock,
                precio: joyas.precio,
            }))

        }

        res.json(response);
        
    } catch (error){
        console.log(error);
    }
});

app.get('/joyas/filter', async (req, res) => {
    try{
        const {precio_min, precio_max, categoria, metal} = req.query;
        let query = 'SELECT * FROM inventario WHERE 1 = 1'; // 1=1 es una técnica que se usa por si no se envia ningun parametro en la url y se devuelven todos los registros
        const values = [];
        let index = 1;
        if (precio_max){
            query += ` AND precio <= $${index}`; // += es para concatenar Select * from inventario where 1 = 1 AND precio <= $1
            values.push(precio_max);
            index++; // para que los valores tenga un indice especifico
        }
        if(precio_min){
            query += ` AND precio >= $${index}`; 
            values.push(precio_min);
            index++;
        };
        if(categoria){
            query += ` AND categoria = $${index}`;
            values.push(categoria);
            index++;
        };
        if(metal){
            query += ` AND metal = $${index}`;
            values.push(metal);
            index++;
        }
        const client = await pool.connect();
        const result = await client.query(query, values);
        res.json(result.rows);
        client.release(); // cerramos la conexion con la base de datos, siempre se debe hacer
    } catch (error){
        console.log(error);
        res.status(500).json(error);
    }

});