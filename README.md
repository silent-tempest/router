# Router

### Example

```javascript
let Router = require( 'router/lib/Router' );
let parser = require( 'body-parser' );

let router = new Router()
  .set( 'view engine', 'ejs' )
  .use( parser.json() );
```
