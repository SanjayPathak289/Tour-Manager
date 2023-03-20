require("dotenv").config()
const mongoose = require("mongoose")
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_NAME}.6bfruws.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const connectDb = async () => {

    try {
        const conn = await mongoose.connect(uri,{
            useNewUrlParser : true,
            useUnifiedTopology: true
        })
        console.log("MongoDB Connection Successful")

    } catch (error) {
        console.log(err)
        
    }

    // mongoose.connect(uri,{
    //     useNewUrlParser : true,
    //     useUnifiedTopology: true
    // }).then(() => {
    //     console.log("MongoDB Connection Successful")
    // }).catch((err) => {
    //     console.log(err)
    // })
}
module.exports.connectDb = connectDb;


