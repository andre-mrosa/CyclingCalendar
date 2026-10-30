import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {databasePoolOptions} from '../app/lib/databaseConnection.js';

test('the actual pg driver verifies certificates despite insecure URL SSL options',()=>{
    for(const query of ['sslmode=require','sslmode=prefer','sslmode=no-verify','sslmode=disable','ssl=0','sslmode=require&uselibpqcompat=true']) {
        const options=databasePoolOptions(`postgresql://fixture:pass%40word@db.example.test/db?${query}&application_name=calendar`);
        const client=new Client(options);
        assert.equal(client.connectionParameters.ssl.rejectUnauthorized,true);
        assert.equal(client.connectionParameters.password,'pass@word');
        assert.equal(new URL(options.connectionString).searchParams.get('application_name'),'calendar');
    }
});

test('invalid database configuration never echoes credentials in errors',()=>{
    assert.throws(()=>databasePoolOptions('https://fixture:private@db.example.test/db'),{message:'Invalid database connection configuration'});
    assert.throws(()=>databasePoolOptions('invalid fixture credentials'),{message:'Invalid database connection configuration'});
});
