const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const userData = new mongoose.Schema({
    username : {
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true
    },
    image : {
        type : String,
        default : "default.png"
    },
    trips : [
        {
            name : String,
            venue : String,
            days : Number,
            saathi : Array,
            duration : Array
        }
         
    ],
    polls : [{
        tripname : String,
        title : String,
        options : [{
            name : String,
            weight : {
                type: Number,
                default : 0
            }
        }],
        member : {
            type : Array,
            default : []
        },
        
        // submit : {
        //     type : Boolean,
        //     default : true
        // }
    }],
    schedule : [
        
        {
        trip : String,
        day : Number,
        date : String,
        task : []
        }
    ],
    resp : [{
        tripname : String,
        respo : String,
        user : Array
    }]

})

userData.methods.generateAuthToken = async function () {
    try {
        const token = jwt.sign({_id : this._id.toString()},process.env.SECRET_KEY)
        // this.tokens = this.tokens.concat({token:token});
        // await this.save();
        return token;
    } catch (error) {
        res.send("Error");
    }
}
const UserCred = new mongoose.model("UserCred",userData);
module.exports = UserCred;
