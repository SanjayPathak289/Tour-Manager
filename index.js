const express = require("express")
const db = require("./db/conn")
const UserCred = require("./db/coll")
const path = require("path");
const hbs = require("hbs")
const cookieParser = require("cookie-parser")
const auth = require("./middleware/auth");
const sessions = require('express-session');
const session = require("express-session");
const multer = require("multer");
const { DefaultSerializer } = require("v8");
const { isAsyncFunction } = require("util/types");
const port = process.env.PORT || 8000;
const app = express()

app.set("view engine", "hbs")
// var exphbs = require("express-handlebars");
// app.engine('hbs' , exphbs({
//     partialDir : partialPath,
//     extname : 'hbs',
//     defaultLayout : 'index',
//     helpers : {

//     }
// }))


hbs.registerHelper( "when",function(operand_1, operator, operand_2, options) {
    var operators = {
     'eq': function(l,r) { return l == r; },
     'noteq': function(l,r) { return l != r; },
     'gt': function(l,r) { return Number(l) > Number(r); },
     'or': function(l,r) { return l || r; },
     'and': function(l,r) { return l && r; },
     '%': function(l,r) { return (l % r) === 0; }
    }
    , result = operators[operator](operand_1,operand_2);
  
    if (result) return options.fn(this);
    else  return options.inverse(this);
  });













const staticPath = path.join(__dirname,"/public");
app.use(express.static(staticPath));

var Storage = multer.diskStorage({
    destination:"./public/uploads/",
    filename:(req,file,cb) => {
        // cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname))
        cb(null,file.fieldname+(req.session.user)+path.extname(file.originalname))
    }
})

const fileFilter = function(req, file, cb){
    if(file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
        cb(null, true);
    }else{
        cb(null, false);
    }
}

var upload = multer({
    storage: Storage,
    fileFilter: fileFilter
}).single('file');


const partialPath = path.join(__dirname,"/partials");
hbs.registerPartials(partialPath);

app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(cookieParser())
const oneDay = 1000 * 60 * 60 * 24;
app.use(sessions({
    secret: "thisismysecrctekeysanjay",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));







var srcPhoto;
app.get("/", auth ,async(req,res) => {
    // if (!(typeof req.session.user == "undefined")) {
        if (srcPhoto) {
            
            res.render("index",{    
                user : req.session.user,
                // src : showImgData.image
                src : srcPhoto
            })       
        }
    //     const showImgData = await UserCred.findOne({username : req.session.user})
    // }
    else{
        res.render("index",{    
            user : req.session.user
        }) 
    }
    



})
app.get("/register", (req,res) => {
    res.render("register");
})

app.post("/register", upload ,async (req,res) => {
    const pass = req.body.password;
    const confirmpass = req.body.confirmpassword;
    const userName = req.body.username;
    const ifUser = await UserCred.findOne({username : userName})
    if(!ifUser){
        if (pass === confirmpass) {
            if (req.file) {
                const userDataifimg = new UserCred({
                    username : req.body.username,
                    password : pass,
                    image: req.file.filename 
                })
                await userDataifimg.save();
            }
            else{
                const userDataifnotimg = new UserCred({
                    username : req.body.username,
                    password : pass
                })
                await userDataifnotimg.save();
            }
            
            res.render("register");
        }
    }
    else{
        res.render("register",{
            // data : "User Already Existed"
            data : "User Already Existed"
        })
    }
    
})

app.post("/login", async (req,res) => {
    try {
        const userName = req.body.username;
        const pass = req.body.password;
        const data = await UserCred.findOne({username : userName});
        const token = await data.generateAuthToken();
        

        if (pass === data.password) {
            res.cookie("jwt",token,{
                expires: new Date(Date.now() + 9999999),
                httpOnly : true,
            });
            req.session.user = userName;
            const showImgData = await UserCred.findOne({username : req.session.user})
            srcPhoto = showImgData.image;
            res.redirect('/');
        }
        else{
            res.render("register",{
                wronguser : "Invalid Username/Password"
            })
        }
        
    } catch (error) {
        res.render("register",{
            wronguser : "Invalid Username/Password"
        })
    }
    
})

app.get("/user_dashboard", auth, async(req,res) => {
   var data1 = [];
    const alluserData = await UserCred.find({});
    var saathiArr = [];
    for(var ele of alluserData){
        for(var ak of ele.trips){
            if(ak.saathi.includes(req.session.user)){
                if (data1.indexOf(ele) === -1) {
                    data1.push(ak.name)
                }
                saathiArr.push({
                    tripname : ak.name,
                    saathi : ak.saathi
                })
                
            }
        } 
    }
    
    res.render("user_dashboard",{
        data : data1,
        allusers : alluserData,
        user : req.session.user,
        src : srcPhoto,
        saathiArr
    })
})

app.post("/user_dashboard", auth, async(req,res) => {
    await UserCred.updateOne({
        username : req.session.user
    },{
        $push : {
            trips : {
                name : req.body.nameTrip,
                saathi : req.body.userSelect
            }
        }
    })
    res.redirect("/user_dashboard")
})




app.post("/update/:trip" , auth, async(req,res) => {

    const uu = await UserCred.findOne({
        'trips.name' : req.params.trip
    }).select({'trips':1})
    uu.trips[0].name = req.body.nameTrip
    uu.trips[0].saathi = req.body.userSelect

    await UserCred.updateOne({
        'trips.name' : req.params.trip
    },{
        $set : {
            'trips' : uu.trips

        }
    })

    res.redirect("/user_dashboard");

})


app.post("/delete/:trip",auth ,async(req,res) => {

    await UserCred.updateOne({
        'trips.name' : req.params.trip
        
     },{
        $pull : {
            trips : {
                name : req.params.trip
            } 
        }
     })

     res.redirect("/user_dashboard");
})






app.get("/mytrips/:tripname",auth, async(req,res) => {

    const pollData = await UserCred.find().select({polls : 1})


    const dateData = await UserCred.find({
        'trips.name' : req.params.tripname
    }).select({'trips.$' : 1})
    
    // durationArr = durationArr.map(x => (new Date(x)).toDateString())
    // durationArr = durationArr.map(
    //     x => (new Date(x)).toDateString()
    // )
    var durationArr = dateData[0].trips[0].duration;
    if (durationArr.length > 0) {
        durationArr[1] = new Date(durationArr[1]).toDateString();
        durationArr[2] = new Date(durationArr[2]).toDateString();
    }
    // console.log(durationArr);
    var pollArray = [];
    var optionArr = [];
    var isShow = true;
    for(var ele of pollData){
       for(var polele of ele.polls){
            if (polele.tripname == req.params.tripname) {
                if (polele.member.includes(`${req.session.user}`)) {
                    isShow = false
                }
                optionArr.push(isShow);

                if(!pollArray.some(pollArray => pollArray.title === polele.title)){
                    pollArray.push(polele); 
                } 
            }
            
            isShow = true;
       }
    }   
    res.render("polls", {
        submit : optionArr,
        trip : req.params.tripname,
        polldata : pollArray,
        duration : durationArr,
        user : req.session.user,
        src : srcPhoto,

    })
    pollArray = []
    
})

app.post("/mytrips/:tripname",async (req,res) => {

        
        if (req.body.fromDate) {
            const dateTitle = req.body.questionTitle
            const fromDate = req.body.fromDate;
            const toDate = req.body.toDate;
            const durArr = []
            durArr.push(dateTitle);
            durArr.push(fromDate);
            durArr.push(toDate);
            await UserCred.updateOne(
                {
                    //username : req.session.user,
                    'trips.name' : req.params.tripname
                },
                { "$set": {
                    'trips.$.duration' : durArr
                }}
            )

        }
        else{
            var optionArray = req.body.optionInput;
        var final = [];
        optionArray.forEach((ele) => {
            final.push({
                name : ele,
                weight : 0
            })
        }) 
        await UserCred.updateOne(
            {username : req.session.user},
            {
                $push : {
                    polls : {
                        tripname : req.params.tripname,
                        title : req.body.questionTitle,
                        options : final
                    }
                }
                
            }
        )
        }
        
 
        // res.redirect("/");
    res.redirect(`/mytrips/${req.params.tripname}`)
})

















app.get("/responsibility/:trip", auth,async(req,res) => {
    const respData = await UserCred.find({
        'resp.tripname' : req.params.trip

    }).select({resp : 1})

console.log(JSON.stringify(respData));
    var respShowData = []
    const alluserData = await UserCred.find({});

    if (respData.length > 0) {
        for(var ele of respData[0].resp){
            if (ele.tripname == req.params.trip) {
                respShowData.push(ele)
            }

        }

        res.render("resp",{
            tripname : req.params.trip,
            allusers : alluserData,
            // respData : respData[0].resp,
            respData : respShowData, 
            user : req.session.user,
            src : srcPhoto,
        })
    }
    else{
        res.render("resp",{
            tripname : req.params.trip,
            allusers : alluserData,
            user : req.session.user,
            src : srcPhoto,
        })
    }
    
})

app.post("/responsibility/:trip/:respo/:index", auth,async(req,res) => {
    await UserCred.updateOne({
        'resp.tripname' : req.params.trip,
        'resp.respo' : req.params.respo
    },{
        $set : {
            [`resp.${req.params.index}`] : {
                tripname : req.params.trip,
                respo : req.body.respInput,
                user : req.body.userSelect
            }
        }
    })

    res.redirect(`/responsibility/${req.params.trip}`)
    // respInput
})

app.post("/responsibility/delete/:trip/:respo/:index", auth,async(req,res) => {
    await UserCred.updateOne({

        'resp.tripname' : req.params.trip,
        'resp.respo' : req.params.respo
        
     },{
        $pull : {
            resp : {
                tripname : req.params.trip,
                respo : req.params.respo
            }
        }
    })

    res.redirect(`/responsibility/${req.params.trip}`);
})




app.post("/responsibility/:trip", auth,async(req,res) => {
    await UserCred.updateOne({
        'trips.name' : req.params.trip
    },{
        $push : {
            resp : {
                tripname : req.params.trip,
                respo : req.body.respInput,
                user : req.body.userSelect
            }
        }
    })

    res.redirect(`/responsibility/${req.params.trip}`)
//taskInput
//userSelect
})






















app.get("/logout", (req,res) => {
    res.clearCookie("jwt");
    res.redirect("/register")
})











app.get("/:user",auth,async (req,res) => {

    if (req.params.user === req.session.user) {
        const loginUserData = await UserCred.findOne({username : req.params.user})
            res.render("userProfile",{
            data : loginUserData,
            user : req.session.user,
            src : loginUserData.image,
        })
    }
    else{
        res.status(404).render("404")

    }
    
})



app.post("/:img/:name", upload,async(req,res) => {

        if (req.file) {
            await UserCred.updateOne({
                username : req.params.name,
                image : req.params.img
            },{
                image : req.file.filename
            })
            

        }

          
            
            res.redirect(`/${req.params.name}`);
        
})





























app.post("/delete/poll/:trip/:pollTitle",auth ,async(req,res) => {

    await UserCred.updateOne({
        'polls.tripname' : req.params.trip,
        'polls.title' : req.params.pollTitle
        
     },{
        $pull : {
            polls : {
                tripname : req.params.trip,
                title : req.params.pollTitle
            } 
        }
     })

     res.redirect(`/mytrips/${req.params.trip}`);
})



app.post("/updateTask/:trip/:day/:task/:index",auth ,async(req,res) => {

    await UserCred.updateOne({

        // $and : [{'schedule.trip' : req.params.trip},{'schedule.day' : req.params.day},{'schedule.task' : {$in : [req.params.task]}}]
        'schedule.trip' : req.params.trip,
        'schedule.day' : req.params.day,
        'schedule.task' : {$in : [req.params.task]}
        
     },{
        $set : {
            [`schedule.${req.params.day-1}.task.${req.params.index}`]: req.body.taskInput
        }
    })
    console.log(req.body.taskInput);
    res.redirect(`/${req.params.trip}/screen`);
})

















app.post("/deleteTask/:trip/:day/:task",auth ,async(req,res) => {

    await UserCred.updateOne({

        $and : [{'schedule.trip' : req.params.trip},{'schedule.day' : req.params.day}]
        
     },{
        $pull : {
            [`schedule.${req.params.day-1}.task`]: req.params.task
        }
    })

    res.redirect(`/${req.params.trip}/screen`);
})



















app.post("/mytrips/update/:tripname",async (req,res) =>{
    const pollData = await UserCred.find().select({polls : 1})
    var pollArr = []
    // console.log(JSON.stringify(req.body));
    for(var ele of pollData){

        for(var polele of ele.polls){

                if (polele.tripname == req.body.tripname) {

                    if (polele.title == `${req.body.title}`) { 
                        var optionId = req.body.title;
                        var optionObj = polele.options[req.body[`${optionId}`]];
                        optionObj.weight += 1;
                        polele.member.push(req.session.user)

                        
                    }
                }
                pollArr.push(polele)
                
        }
    }
    await UserCred.updateOne({
        "polls.tripname" : req.body.tripname
    },{
        polls : pollArr
    })
       
    pollArr = []
    res.redirect(`/mytrips/${req.params.tripname}`)
//     res.redirect('/')
//     res.render("polls", {
//         trip : req.params.tripname,
//         polldata : pollArr
//    })
})











app.get("/:trip/screen",auth,async (req,res) => {
    const screenData = await UserCred.find({
        "polls.tripname" : req.params.trip 
    }).select({polls:1})
    

     
        const dateData = await UserCred.find({
            'trips.name' : req.params.trip
        }).select({'trips.$' : 1})
        var screenDate = [];
        var durationArr = dateData[0].trips[0].duration;
        const dateTitle = durationArr[0];
        const fromDate = new Date(durationArr[1]).toDateString();
        const toDate = new Date(durationArr[2]).toDateString();
    
        const noOfDays = ((new Date(durationArr[2]).getTime()) - (new Date(durationArr[1]).getTime()))/(86400000) + 1;
    
        const startTripDate = new Date(durationArr[1]);
        var nextDay = new Date(startTripDate);
    
    
    
    
        var scheduleArr = []
        for (let i = 1; i <= noOfDays ; i++) {
    
            const taskArr = await UserCred.find({
                'schedule.trip' : req.params.trip,
                'schedule.day' : i
            }).select({'schedule.$': 1})
                scheduleArr.push({
                    trip : req.params.trip,
                    day : i,
                    date : nextDay.toDateString(),
                    task : (typeof taskArr[0] === 'undefined') ? [] : taskArr[0].schedule[0].task
                })
    
    
    
    
            nextDay.setDate(nextDay.getDate() + 1);
            
        }
    
        
    
    
    
        await UserCred.updateOne(
            {'trips.name' : req.params.trip},
            {
                $set : {
                    schedule : scheduleArr
                }
                
            }
        )
    
    
        if(!(screenDate.length > 0)){
            screenDate.push(dateTitle,fromDate,toDate);
        } 
        
        var screenObj = []
    if (screenData.length > 0) {

        for(var ele of screenData[0].polls){
            if (ele.tripname == req.params.trip) {
                var optionTitle;
                var winnerOptionName;
                var winnerOptionWeight = 0;
                for(var optionele of ele.options){
                    
                    if (optionele.weight > winnerOptionWeight) {
                        winnerOptionWeight = optionele.weight;
                        winnerOptionName = optionele.name
                        optionTitle = ele.title
                    }
                    
                }
                if ((winnerOptionName !== undefined)) {
                    
                    if(!screenObj.some(screenObj => screenObj.title === optionTitle)){
                        screenObj.push({
                            title : optionTitle,
                            name : winnerOptionName,
                            weight : winnerOptionWeight
                        })
                    } 
    
                    
                }
            }   
        }
    
        // const alluserData = await UserCred.find({});
        // const scheduleArr = await UserCred.find({
    
        // })
        res.render("itineraryScreen",{
            data : screenObj,
            screenDate : screenDate,
            scheduleArr : scheduleArr,
            tripname : req.params.trip,
            user : req.session.user,
            src : srcPhoto,
        });










    }
    else{
        res.render("itineraryScreen",{
            screenDate : screenDate,
            scheduleArr : scheduleArr,
            tripname : req.params.trip,
            user : req.session.user,
            src : srcPhoto,
        });

    }

    

})


app.post("/:tripname/update/:day/screen", async(req,res) => {
    // req.body.taskInput
    // const schData = await UserCred.find({
    //     'schedule.day' : req.params.day,
    //     'schedule.trip' : req.params.tripname
    // }).select({[`schedule.${req.params.day}`] : 1})
    // console.log(JSON.stringify(schData));
    // for(var ele of schData[0].schedule){
    //     // for(var scheele of ele){
    //         if (ele.day == req.params.day) {
    //             ele.task.push(req.body.taskInput)
    //         }
            
    //         // }
    //     }

    // for(var ele of schData[0].schedule){
        // const data = await UserCred.findOne({
        //     'schedule.trip' : req.params.tripname,
        //     'schedule.day' : 1
        // }).select({'schedule.$' : 1})
        
        await UserCred.updateOne({

            "schedule" : { "$elemMatch": { "trip": req.params.tripname, "day": req.params.day }}
            },{
                // $push : {
                //     'schedule.$.task' : "Hello"
                // }
                $push: {'schedule.$.task' : req.body.taskInput}
            })
            
       
    // }
        

    // await UserCred.updateOne({
    //     'schedule.trip' : req.params.tripname
    // },{
    //     $set : {
    //         'schedule.$' : schData[0].schedule
    //     }
    // })

    res.redirect(`/${req.params.tripname}/screen`)
})



app.get('*' , auth , (req,res) => {
    res.status(404).render("404", {
        user : req.session.user,
        src : srcPhoto,
    })
})

db.connectDb().then(() => {

    app.listen(port,(req,res)=>{
        console.log("Server Created")
    })
})