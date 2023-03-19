const jwt = require("jsonwebtoken");
// const {CredColl} = require("../db/coll");

const auth = async(req,res,next) => {
    try {
        const token = req.cookies.jwt;
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY)
        next();
    } catch (error) {
        res.render("index");
    }
}
module.exports = auth;
