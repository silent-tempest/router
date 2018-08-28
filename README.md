# Router

### Example

* Create a router.

```javascript
let Router = require( 'router/lib/Router' );
let router = new Router();
```

* Setup router.

```javascript
router.set( 'view engine', 'ejs' );
```

* Add routes.

```javascript
router.get( '/', ( request, response, next ) => {
  response.status( 200 ).render( 'home', next );
} );
```

* Add error handlers.

```javascript
router.use( ( error, request, response, next ) => {
  response.status( 500 ).end();
} );
```

* Run server

```javascript
let { Server } = require( 'http' );

let server = new Server( ( request, response ) => {
  router.handle( request, response );
} );

server.listen( 3000 );
```

* Open http://localhost:3000
