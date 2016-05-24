'use strict'
const config = require( __dirname + '/../dbconfig.json').pg

const db  = require('pg')
const q   = require('q')

//Tables
let tables = {
  user: 'testUser'
}

module.exports = {
  init: setupDatabase,
  instance: null,
  tables: tables
}

function connect(){
  var deferred = q.defer()
  console.log('trying to connect..')
  db.defaults.ssl = true
  db.connect(config.url, function(err, client) {
    if (err) {
      console.error('error connecting: ' + err.stack)
      deferred.reject(err)
    } else {
      module.exports.instance = client
      console.log('Connected to postgres!')
      deferred.resolve()
    }
  });

  return deferred.promise
}

// function createUserTable(){
//   const deferred = q.defer()

//   postgres.query('CREATE TABLE IF NOT EXISTS testUser (id int);')

//   deferred.resolve()

//   return deferred.promise
// }


function setupDatabase () {
  return connect()

    .then( () => {
      console.log("Connected to Database")
    })
    .catch( err => {
      console.log("Database Error: ", err)
    })
}

