const http = require('http');
// calling file in folder
const path = require('path');
const express = require('express');
// calling directory name
const {dirname} = require('path');
// calling folder hbs
const hbs = require('hbs');
// menampung library kedalam var. path
const app = express();
// connection to db
const dbConnection = require('./connection/db');
// get response
const { response } = require('express');
// call express-session
const session = require('express-session');
const { query } = require('./connection/db');

// calling upload file
const uploadFile = require('./middleware/uploadFile');
const { type } = require('os');
const { request } = require('https');

app.use(express.json());
app.use('/template', express.static(path.join(__dirname, 'template')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({extended:false}));
// mengatur jangka waktu ketika login
app.use(
    session(
        {
            cookie:{
                // 1000 milidetik * 60 detik * 60 menit
                maxAge: 1000 * 60 * 60 * 2,
                // keamanan
                secure: false,
                httpOnly: true
            },
            // menyimpan session
            store: new session.MemoryStore(),
            saveUninitialized: true,
            resave: false,
            secret: 'secretkey'
        }
    )
);


// setup flash message midleware
app.use(function(request, response, next){
    response.locals.user = request.session.user
    response.locals.message = request.session.message
    delete request.session.message
    next()
});

// // registrasi bagian partials
hbs.registerPartials(__dirname + '/views/partials');

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            // console.log(v1,v2)
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

app.set('view engine', 'hbs');

let isLogin = false;

// membuat path
const pathFile = 'http://localhost:3000/uploads/';

// tampilan utama pada project
app.get('/', function(request, response){

    const query = `SELECT * FROM movies ORDER BY id DESC`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            const movies = []

            for(let result of results) {
                movies.push({
                    id : result.id,
                    name : result.name,
                    photo : pathFile + result.photo,
                    director : result.director,
                    cast : result.cast,
                    movie_hours : result.movie_hours
                })
            }
            response.render('index', {
                title : 'DumbWays Theater',
                isLogin : request.session.isLogin,
                movies
            })
        })
        conn.release();
    }) 
});

app.get('/register', function(request, response){
    response.render('register', {
        title : 'Register',
        isLogin : request.session.isLogin
    })
});

app.post('/register', function(request, response){
    const {first_name, last_name, email, password} = request.body

    if(first_name == '' || last_name == '' || email == '' || password == ''){
        request.session.message = {
            type : 'danger',
            message: 'Please insert all data'
        }
        return response.redirect('/register')
    }

    const query = `INSERT INTO users (first_name, last_name, email, password) VALUES ("${first_name}", "${last_name}", "${email}", ${password})`
    
    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err
            request.session.message = {
                type : 'success',
                message: 'Your has register'
            }
            response.redirect('/register')
        })
        conn.release();
    })
});

app.get('/login', function(request, response){
    const title = "Article"
    response.render('login', {
        title : title
    })
});

app.post('/login', function(request, response, next){
    const {email, password} = request.body

    if( email == '' || password == ''){
        request.session.message = {
            type : 'danger',
            message: 'Please insert all data'
        }
        return response.redirect('/login')
    }

    const query = `SELECT *, MD5(password) AS password FROM users WHERE email="${email}" AND password=${password}`
    
    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err
            
            if(results.length == 0) {
                request.session.message = {
                    type : 'danger',
                    message: 'Please insert all data'
                }
                response.redirect('/login')
            }else{
                request.session.message = {
                    type : 'success',
                    message: 'Your has Login'
                }
                request.session.isLogin = true
                isLogin = true

                // get from users
                request.session.user ={
                    id: results[0].id,
                    is_admin: results[0].is_admin,
                    first_name: results[0].first_name,
                    last_name: results[0].last_name,
                    email: results[0].email,
                    password: results[0].password
                }
                
            }
            response.redirect('/')
        })
        conn.release();
    })

});

app.get('/logout', function(request, response){
    request.session.destroy()
    response.redirect('/')
});

app.get('/addType', function(request, response){
    const query = `SELECT * FROM types`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            const types = []
                for(let result of results) {

                    types.push({
                        id : result.id,
                        name : result.name,
                    })
                }

            response.render('addType', {
                title : 'Add Type',
                isLogin : request.session.isLogin,
                types
            })
        })
        conn.release();
    })
});

app.post('/addType', function(request, response){
    const {name} = request.body

    if(name == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input genre!'
        }
        return response.redirect('/addType')
    }

    const query = `INSERT INTO types (name) VALUES ("${name}")`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err
            request.session.message = {
                type : 'success',
                message: 'Your data has been submit!'
            }
            response.redirect('/addType')
        })
        conn.release();
    })
});

app.get('/type', function(request, response){
    const query = `SELECT * FROM types`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            const types = []
                for(let result of results) {

                    types.push({
                        id : result.id,
                        name : result.name,
                    })
                }

            response.render('type', {
                title : 'Genre Movie',
                isLogin: request.session.isLogin,
                types
            })
        })
        conn.release();
    })
});

app.get('/edit-type/:id', function(request, response){
    const {id} = request.params
    const query = `SELECT * FROM types WHERE id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err
            
            const type = {
                id : results[0].id,
                name : results[0].name
            }
            
            response.render('editType', {
                title : 'Genre Movie',
                isLogin : request.session.isLogin,
                type
            })
        })
        conn.release();
    })
})

app.post('/edit-type/:id', function(request, response){
    const {id} = request.params
    const {name} = request.body
    const query = `UPDATE types SET name="${name}" WHERE id=${id}`

    if(name == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input genre!'
        }
        return response.redirect('/type')
    }

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err
            request.session.message = {
                type : 'success',
                message: 'Your data has been submit!'
            }
            response.redirect('/type')
        })
        conn.release();
    })
})

app.get('/delete-type/:id', function(request,response){
    const id = request.params.id

    const query = `DELETE FROM types WHERE id=${id}`
    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        console.log(query)
        

        conn.query(query, function(err, results) {
            console.log(results)
            if(err) throw err
            
            response.redirect('/type')
        })
        conn.release();
    }) 
});

app.get('/movie/:id', function(request, response){
    var {id} = request.params;

    const query = `SELECT movies.id, movies.name, photo, director, cast, synopsis, movie_hours, type_id, types.name AS genre FROM movies 
                    INNER JOIN types ON movies.type_id=types.id 
                    WHERE movies.id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            const movie = { 
                id : results[0].id,
                name : results[0].name,
                photo : pathFile + results[0].photo,
                director : results[0].director,
                cast : results[0].cast,
                synopsis: results[0].synopsis,
                movie_hours : results[0].movie_hours,
                type_id : results[0].type_id,
                genre : results[0].genre
            }

            response.render('movie', {
                title: 'Movie',
                isLogin: request.session.isLogin,
                movie
            })
        })
        conn.release();
    }) 
});

app.get('/delete-movie/:id', function(request, response) {
    const id = request.params.id

    const query = `DELETE FROM movies WHERE id=${id}`
    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            response.redirect('/')
        })
        conn.release();
    }) 
})

app.get('/addMovie', function(request, response){
    const query = `SELECT * FROM types`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            const types = []
                for(let result of results) {

                    types.push({
                        id : result.id,
                        name : result.name,
                    })
                }

            response.render('addMovie', {
                title : 'Add Movie',
                isLogin : request.session.isLogin,
                types
            })
        })
        conn.release();
    })
});

app.post('/addMovie', uploadFile('photo'), function(request, response){
    const {name, director, cast, synopsis, movie_hours, type_id} = request.body
    let photo = ''

    if(request.file){
        photo = request.file.filename
    }

    if(name == '' || photo == '' || director == '' || cast == '' || synopsis == '' || movie_hours == '' || type_id == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input data all!'
        }
        return response.redirect('/addMovie')
    }

    const query = `INSERT INTO movies (name, photo, director, cast, synopsis, movie_hours, type_id) 
    VALUES ("${name}", "${photo}", "${director}", "${cast}", "${synopsis}", "${movie_hours}", ${type_id})`

    dbConnection.getConnection(function(err, conn){
        // console.log(query)
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err

            request.session.message = {
                type : 'success',
                message: 'Add Movie has been submit!'
            }
            response.redirect(`/movie/${results.insertId}`)
        })
        conn.release();
    })

});

app.get('/edit-movie/:id',async function(request, response){
    const {id} = request.params

    let types = await getType()
    let movie = await getMovie(id)

    response.render('editMovie', {
        title : 'Edit Movie',
        isLogin : request.session.isLogin,
        types,
        movie
    })
});

async function getType(){
    const query = `SELECT * FROM types`

    return new Promise((resolve, reject)=>{
        dbConnection.query(query,  (error, results)=>{
            if(error){
                return reject(error);
            }
            const types = []
            for(let result of results) {

                types.push({
                    id : result.id,
                    name : result.name,
                })
            }
            return resolve(types);
            
        });
    });
};

async function getMovie(id){
    const query = `SELECT movies.id, movies.name, photo, director, cast, synopsis, movie_hours, type_id, types.name AS genre 
                FROM movies INNER JOIN types ON movies.type_id=types.id WHERE movies.id=${id}`

    return new Promise((resolve, reject)=>{
        dbConnection.query(query,  (error, results)=>{
            if(error){

                return reject(error);
            }
            const movie = {
                id : results[0].id,
                name : results[0].name,
                photo : pathFile + results[0].photo,
                director : results[0].director,
                cast : results[0].cast,
                synopsis: results[0].synopsis,
                movie_hours : results[0].movie_hours,
                type_id : results[0].type_id,
                genre : results[0].genre
            }
            return resolve(movie);
        });
    });
};

app.post('/edit-movie', uploadFile('photo'), function(request, response){
    let {id, name, oldImage, director, cast, synopsis, movie_hours, type_id} = request.body;
    let photo = oldImage.replace(pathFile, '');

    if (request.file) {
        photo = request.file.filename;
    }

    if(name == '' || photo == '' || director == '' || cast == '' || synopsis == '' || movie_hours == '' || type_id == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input genre!'
        }
        return response.redirect('/')
    }

    const query = `UPDATE movies SET name="${name}", photo="${photo}", director="${director}", 
            cast="${cast}", synopsis="${synopsis}", movie_hours="${movie_hours}", type_id=${type_id} WHERE id=${id}`;

    dbConnection.getConnection((err, conn) => {
        if(err) throw err
    
        conn.query(query, (err, results) => {

            if(err) throw err
            request.session.message = {
                type : 'success',
                message: 'Your data has been submit!'
            }
        response.redirect(`/movie/${id}`);
        });
        conn.release();
    });
});

app.get('/ticket', function(request, response){

    const query = `SELECT date_show, time_show, seat, venue, price, users.first_name AS name 
    FROM tickets INNER JOIN users ON tickets.user_id=users.id`
    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            console.log(query)
            if(err) throw err
            
            const tickets = []

            for(let result of results) {
                tickets.push({
                    id : result.id,
                    date_show : result.date_show,
                    time_show : result.time_show,
                    seat : result.seat,
                    venue : result.venue,
                    price: result.price,
                    name : result.name
                })
            }
            response.render('ticket', {
                title : 'My Ticket',
                isLogin : request.session.isLogin,
                tickets
            })
        })
        conn.release();
    }) 
})

app.get('/addTicket/:id', function(request, response){
    const id = request.params.id
    if (!isLogin) {
        response.redirect('/login')
    }
    response.render('addTicket', {
        title : 'Booking Ticket',
        isLogin : request.session.isLogin,
        id
    })
});

app.post('/addTicket/:id', function(request, response){
    const {date_now, time_now, seat, price, venue} = request.body
    const movieId = request.params.id
    const userId = request.session.user.id

    if(date_now == '' || time_now == '' || seat == '' || price == '' || venue == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input all data!'
        }
        return response.redirect('/addTicket/${movieId}')
    }
    
    const query = `INSERT INTO tickets (date_show, time_show, seat, price, venue, movie_id, user_id) 
    VALUES ("${date_now}", "${time_now}", "${seat}", ${price}, "${venue}", ${movieId}, ${userId})`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err

            request.session.message = {
                type : 'success',
                message: 'Add Movie has been submit!'
            }
            response.redirect(`/ticketDetail/${results.insertId}`)
        })
        conn.release();
    })
});

app.get('/ticketDetail/:id', function(request, response){
    const {id} = request.params

    const query = `SELECT tickets.id, day(date_show) AS day, month(date_show) AS month, year(date_show) AS year, time_show, seat, venue, price, users.first_name AS name, movies.name AS title_movie 
    FROM tickets INNER JOIN users ON tickets.user_id=users.id INNER JOIN movies ON tickets.movie_id=movies.id WHERE tickets.id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            console.log(query)

            const ticket = { 
                id : results[0].id,
                title_movie : results[0].title_movie,
                day : results[0].day,
                month : results[0].month,
                year : results[0].year,
                time_show : results[0].time_show,
                seat : results[0].seat,
                venue : results[0].venue,
                price: results[0].price,
                name : results[0].name
            }
            console.log(ticket)
            response.render('ticketDetail', {
                title : 'My Ticket',
                isLogin : request.session.isLogin,
                ticket
            })
        })
        conn.release();
    }) 
});

app.get('/delete-ticket/:id', function(request, response) {
    const id = request.params.id

    const query = `DELETE FROM tickets WHERE id=${id}`
    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            response.redirect('/')
        })
        conn.release();
    }) 
});

app.get('/edit-ticket/:id', function(request, response){
    const {id} = request.params

    const query = `SELECT * FROM tickets WHERE id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {

            if(err) throw err
            
            const ticket = {
                id : results[0].id,
                date_show : results[0].date_show,
                time_show : results[0].time_show,
                seat : results[0].seat,
                venue : results[0].venue,
                price: results[0].price
            }
            
            response.render('editTicket', {
                title : 'Edit Ticket',
                isLogin : request.session.isLogin,
                ticket
            })
        })
        conn.release();
    })
});

app.post('/edit-ticket/:id', function(request, response){
    const {id} = request.params
    const {date_now, time_now, seat, price, venue} = request.body

    if(date_now == '' || time_now == '' || seat == '' || price == '' || venue == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input all data!'
        }
        return response.redirect('/editTicket/:id')
    }

    const query = `UPDATE tickets SET date_show="${date_now}", time_show="${time_now}", seat="${seat}", 
                    price="${price}", venue="${venue}" WHERE id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, (err, results) => {

            if(err) throw err

            request.session.message = {
                type : 'success',
                message: 'Edit Movie has been submit!'
            }
            response.redirect(`/ticketDetail/${id}`)
        });
        conn.release();
    })
});

app.get('/payment/:id', function(request, response){
    const {id} = request.params
    
    const query = `SELECT tickets.id, price, users.first_name AS name, movies.name AS title_movie 
    FROM tickets INNER JOIN users ON tickets.user_id=users.id 
    INNER JOIN movies ON tickets.movie_id=movies.id WHERE tickets.id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err

            const ticket = { 
                id : results[0].id,
                title_movie : results[0].title_movie,
                price: results[0].price,
                name : results[0].name
            }
            response.render('payment', {
                title : 'My Order',
                isLogin : request.session.isLogin,
                ticket
            })
        })
        conn.release();
    }) 
});

app.post('/payment/:id', function(request, response){
    const {amount, sub_total} = request.body
    const ticketId = request.params.id
    const kode_tiket = randomString(10, '#A')

    if(amount == '' || sub_total == ''|| ticketId == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input all data!'
        }
        return response.redirect('/')
    }
    
    
    const query = `INSERT INTO payments (amount, sub_total, ticket_id, kode_tiket) 
    VALUES ("${amount}", "${sub_total}", "${ticketId}", "${kode_tiket}")`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err

            request.session.message = {
                type : 'success',
                message: 'Add Movie has been submit!'
            }
            response.redirect(`/paymentDetail/${results.insertId}`)
        })
        conn.release();
    })
});

function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
    return result;
}

app.get('/paymentDetail/:id', function(request, response){
    const {id} = request.params

    const query = `SELECT payments.id, tickets.price, amount, sub_total, kode_tiket, users.first_name AS name, movies.name AS title_movie 
    FROM payments INNER JOIN tickets ON payments.ticket_id=tickets.id
    INNER JOIN users ON tickets.user_id=users.id 
    INNER JOIN movies ON tickets.movie_id=movies.id WHERE payments.id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err

            const payment = { 
                id : results[0].id,
                price : results[0].price,
                amount : results[0].amount,
                sub_total : results[0].sub_total,
                kode_tiket : results[0].kode_tiket,
                name : results[0].name,
                title_movie : results[0].title_movie
            }
            
            response.render('paymentDetail', {
                title : 'My Payment',
                isLogin : request.session.isLogin,
                payment
            })
        })
        conn.release();
    }) 
});

app.get('/edit-payment/:id', function(request, response){
    const {id} = request.params

    const query = `SELECT payments.id, tickets.price, amount, sub_total, users.first_name AS name, movies.name AS title_movie 
    FROM payments INNER JOIN tickets ON payments.ticket_id=tickets.id
    INNER JOIN users ON tickets.user_id=users.id 
    INNER JOIN movies ON tickets.movie_id=movies.id WHERE payments.id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {

            if(err) throw err
            
            const payment = { 
                id : results[0].id,
                price : results[0].price,
                amount : results[0].amount,
                sub_total : results[0].sub_total,
                name : results[0].name,
                title_movie : results[0].title_movie
            }
            
            response.render('editPayment', {
                title : 'Edit My Payment',
                isLogin : request.session.isLogin,
                payment
            })
        })
        conn.release();
    })
});

app.post('/edit-payment/:id', function(request, response){
    const {amount, sub_total} = request.body
    const {id} = request.params

    if(amount == '' || sub_total == '') {
        request.session.message = {
            type : 'danger',
            message: 'Please input all data!'
        }
        return response.redirect('/')
    }
    
    const query = `UPDATE payments SET amount="${amount}", sub_total="${sub_total}"  WHERE id=${id}`

    dbConnection.getConnection(function(err, conn){
        if(err) throw err

        conn.query(query, function(err, results) {
            if(err) throw err

            request.session.message = {
                type : 'success',
                message: 'Payment has been submit!'
            }
            response.redirect(`/paymentDetail/${id}`)
        })
        conn.release();
    })
});

app.get('/delete-payment/:id', function(request, response) {
    const id = request.params.id

    const query = `DELETE FROM payments WHERE id=${id}`
    dbConnection.getConnection(function(err, conn){
        if(err) throw err
        

        conn.query(query, function(err, results) {
            if(err) throw err
            
            response.redirect('/')
        })
        conn.release();
    }) 
});

const port = 3000
// membuat server di dalam app
const server = http.createServer(app)
server.listen(port)
