const express = require('express');
const app = express();
require('dotenv').config();
const morgan = require('morgan');
const dbConnection = require('./config/db');
const port = process.env.PORT;
app.use(express.json());

const authRouter = require('./Routers/authRouter');
const brandRouter = require('./Routers/brandRouter');
const categoryRouter = require('./Routers/categoryRouter');
const subCategoryRouter = require('./Routers/subCategoryRouter')
const userRouter = require('./Routers/userRouter')
const reviewRouter = require('./Routers/reviewRouter')
const productRouter = require('./Routers/productRouter')
const cartRouter = require('./Routers/cartRouter')
const orderRouter = require('./Routers/orderRouter')


const globalError = require('./middleWare/globalError')
const ApiError = require('./utils/apiError')
app.use('/v1/auth', authRouter);
app.use('/api/v1/brand', brandRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/sub-category', subCategoryRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/review', reviewRouter);
app.use('/api/v1/product', productRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/order', orderRouter);

dbConnection()
//middleWare 
app.use(express.json());

app.use((req, res, next) =>{
    console.log("Welcome to middleWare");
    next();
})


// app.all('*', (req, res, next) => {
//     next(new ApiError(`this route ${req.originalUrl} not found` , 400))

// })

//global error handling middleware
app.use(globalError)


if(process.env.NODE_ENV ==="development"){
    app.use(morgan('dev'))

}


app.listen(port, ()=>{
    console.log(`server is running on port ${port}`)
})