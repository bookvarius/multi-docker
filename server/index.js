const keys = require('./keys.js');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { Pool } = require('pg'); 
const pgClient = new Pool({
    user: keys.pgUser,
    password: keys.pgPassword,
    host: keys.pgHost,
    port: keys.pgPort,
    database: keys.pgDatabase
});

pgClient.on('error', () => console.log('Lost PG connection'));

pgClient.query('create table if not exists values(number int)')
    .catch((err) => console.log(err));


const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

app.get('/api', (req, res) => {
    res.send('Huy!');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('select * from values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
	res.send(values);
    });
})

app.post('/values', async (req, res) => {
    const index = req.body.index;

    console.log('Server: got index: ' + index);

    if(parseInt(index) > 40) {
	res.status(433).send('Value is too large');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);

    pgClient.query('insert into values(number) values($1)', [index]);

    res.send({ working: true });
});

app.listen(5000, err => {
    console.log('Waiting for connections...');
});




