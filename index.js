// ----------------------------------------------------------------------------
//  Created By  : @aaryswastaken
//  Created Date: 24/08/2022
//  version: 1.0
//  ---------------------------------------------------------------------------

const fastify = require('fastify')({ logger: false });
require("dotenv").config();
const { exec, spawn } = require('child_process');

const fs = require("fs");
const { escape } = require('querystring');

var log4js = require("log4js");

log4js.configure({
    appenders: { web: { type: "file", filename: "logger.log" }, console: { type: "console" } },
    categories: { default: { appenders: ["web", "console"], level: "trace" } },
})

var logger = log4js.getLogger("web");
var app_logger = log4js.getLogger("app");

logger.info("Application started");

const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const iface = "wlan0";

const port = 3000;

let ip_addr = "";
nets[iface].forEach((e) => {
    if (e.address.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)) {
        ip_addr = e.address
    }
})

logger.debug("IP ADDRESS: "+ip_addr)

const debug_flags = ["-d", "--debug"]
let debug = process.argv.some(s => debug_flags.includes(s))

if (debug) {
    logger.warn("--- DEBUG ENABLED ---")
}

fastify.register(require("@fastify/view"), {
    engine: {
        ejs: require("ejs"),
    },  
});

fastify.register(require('@fastify/cookie'), {
    secret: "signature", // for cookies signature
    parseOptions: {}     // options for parsing cookies
})

fastify.register(require('@fastify/formbody'))

fastify.register(require('fastify-file-upload'))

class SettingsManager{
    constructor() {
        this.settings = JSON.parse(fs.readFileSync("./settings.json"))
        this.fields = {"auto_start": Boolean}
    }

    set(field, value) {
        this.settings[field] = value
        fs.writeFileSync("./settings.json", JSON.stringify(this.settings))
    }

    get(field) {
        return this.settings[field]
    }
}

const settings = new SettingsManager()
let app_process = NaN;

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+"*!-_{}%&/()=?';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return btoa(result);
}

const auth_hash = debug ? "makeid(20)" : makeid(20);
logger.debug("Auth hash is:", auth_hash)

function isAuth(req) {
    return req.cookies.auth == auth_hash
}

function fmt(val, type) {
    if (type == Boolean) {
        return val == "1" || val == "true"
    }
}

function start_app() {
    app_logger.info("Starting application");

    if (!isNaN(app_process)) {
        app_logger.warn("Application is already started... exiting")
        stop_app()
    }

    let p = process.env.APP_EXECUTABLE.split(" ")
    if (p.length == 1) {
        app_logger.info("Starting:", p[0])
        app_process = spawn(p[0])
    } else {
        let s = p[0]
        p.shift()
        app_logger.info("Starting:", s, p.join(" "))
        app_process = spawn(s, p)
    }

    app_process.on('message', (data, sH) => {
        app_logger.info("Child process: " + data);
    })

    app_process.stdout.on('data', (data) => {
        app_logger.info("Child process: " + data);
    })

    app_process.stderr.on('data', (data) => {
        app_logger.error("Error on child process: " + data);
    })

    app_process.on("error", (err) => {
        app_logger.error("Direct error: " + err)
    })

    app_logger.info("App started")
}

function stop_app() {
    app_logger.info("Stopping application")
    app_process.stdin.pause();
    app_process.kill();

    app_process = NaN;
}

function initialise() {
    logger.info("Testing if the configuration is correct...")
    let files = fs.readdirSync("./")
    
    // Test if there is a footer_default.png
    if (files.some(s => s == "footer_default.png")) {
        logger.info("footer_default.png is present");
    } else {
        logger.fatal("footer_default.png is absent, quitting");
        process.exit(1)
    }
    
    // Test if there is a footer.png
    if (files.some(s => s == "footer.png")) {
        logger.info("footer.png is present");
    } else {
        logger.error("footer.png is absent, apply default");
        fs.writeFileSync("footer.png", fs.readFileSync("footer_default.png"))
    }

    // Test if there is a settings.json
    if (files.some(s => s == "settings.json")) {
        logger.info("settings.json is present");
    } else {
        logger.fatal("settings.json is absent, quitting");
        process.exit(1)
    }

    // Test if there is a directory for the output
    if (fs.existsSync("./save")) {
        logger.info("save folder is present");
    } else {
        logger.error("save foler is absent, creating one");
        fs.mkdirSync("./save")
    }
}

fastify.get("/", (req, res) => {
    logger.info("GET /")
    if (isAuth(req)) {
        res.view("/templates/index.ejs", {settings: settings.settings});
    } else {
        logger.warn("Not authentified, redirecting to login...")
        res.redirect("/login");
    }
});

fastify.get("/app_", (req, res) => {
    logger.info("GET /app_")
    if (isAuth(req)) {
        let sp = req.url.split("?")

        if(sp.length > 1) {
            let p = sp[1].split("&")
            if (p.includes("start")) {
                start_app()
            }
            if (p.includes("stop")) {
                stop_app()
            }
        }

        res.code(200)
        return "Ok"
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.get("/settings", (req, res) => {
    logger.info("GET /settings")
    if (isAuth(req)) {
        return settings.settings
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.post("/settings", (req, res) => {
    logger.info("POST /settings")
    if (isAuth(req)) {
        let parsed = req.url.split("?")

        if (parsed.length > 1) {
            let couples = parsed[1].split("&").map(e => e.split("=").map(s => decodeURI(s)))

            couples.forEach(couple => {
                if (Object.keys(settings.fields).includes(couple[0])) {
                    settings.set(couple[0], fmt(couple[1], settings.fields[couple[0]]))
                }
            })

            return "OK"
        } else {
            return "OK"
        }
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.post("/footer_default", (req, res) => {
    logger.info("POST /footer_default")
    if (isAuth(req)) {
        fs.writeFileSync("footer.png", fs.readFileSync("footer_default.png"))
        res.code(200)
        return "Ok"
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.post("/footer_upload", (req, res) => {
    logger.info("POST /footer_upload")
    if (isAuth(req)) {
        const files = req.raw.files
        
        if (files !== undefined) {
            if (Object.keys(files).some(s => s == 'footer.png')) {
                fs.writeFileSync("footer.png", files["footer.png"].data)
                console.log("[^] New footer successfully uploaded")
                res.code(200)
                return "Ok"
            } else {
                logger.error("Wrong file")
                res.code(406)
                return "Wrong file"
            }
        } else {
            logger.error("File not provided")
            res.code(406)
            return "File not provided"
        }
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.post("/footer_upload_raw", (req, res) => {
    logger.info("POST /footer_upload_raw")
    if (isAuth(req)) {
        if (Object.keys(req.body).includes("footer_raw")) {
            if (req.body["footer_raw"].startsWith("data:image/png;base64,")) {
                let raw = req.body["footer_raw"].replace(/^data:image\/\w+;base64,/, "");
                let buffer = Buffer.from(raw, "base64");

                console.log(buffer)

                fs.writeFileSync("footer.png", buffer)
                res.code(200)
                return "Ok"
            } else {
                logger.warn("File invalid")
                res.code(406)
                return "File invalid"
            }
        } else {
            logger.error("File not provided")
            res.code(406)
            return "File not provided"
        }
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.post("/set_default_footer", (req, res) => {
    logger.info("POST /set_default_footer")
    if (isAuth(req)) {
        fs.writeFileSync("./footer.png", fs.readFileSync("./footer_default.png"))

        res.code(200)
        return "Ok"
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.get("/download_images", (req, res) => {
    logger.info("GET /download_images")
    if (isAuth(req)) {
        exec("zip -r export.zip save", (err, _stdout, _stdin) => {
            if (err) {
                res.code(501)
                return "Unexpected error in the zip creation"
            }
        })

        res.header(
            'Content-Disposition',
            'attachment; filename=export.zip');
        res.send(fs.readFileSync("export.zip")).type('application/zip').code(200)
        return "Ok"
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.post("/delete_images", (req, res) => {
    logger.info("POST /delete_images")
    if (isAuth(req)) {
        exec("rm -r save/*", (err, _stdout, _stdin) => {
            if (err) {
                res.code(501)
                return "Unexpected error in the zip creation"
            }
        })

        res.code(200)
        return "Ok"
    } else {
        logger.warn("Not authentified, throwing 401")
        res.code(401)
        return "Unauthorized"
    }
})

fastify.get("/login", (req, res) => {
    logger.info("GET /login")

    let i = false;
    let l = req.url.split("?");
    if (l.length > 1) {
        if (l[1].includes("incorrect")) {
            i = true;
        }
    }

    res.view("/templates/login.ejs", {incorrect: i});
});

fastify.post("/login", (req, res) => {
    logger.info("POST /login")

    if (process.env.APP_USERNAME == req.body.username && process.env.APP_PASSWORD == req.body.password) {
        logger.info("Auth succeeded")
        res.cookie("auth", auth_hash)
        res.redirect("/")
    } else {
        logger.error("Auth failed")
        res.redirect("/login?incorrect=true")
    }
});

fastify.get("/logout", (req, res) => {
    logger.info("GET /logout")
    res.cookie("auth", "")
    res.redirect("/login")
})

const start = async () => {
    initialise()

    if (settings.settings.auto_start) {
        logger.info("Autostart enabled")
        start_app()
    }

    try {
        logger.info("Listening on 0.0.0.0:"+port.toString());
        logger.info("Access on http://"+ip_addr+":"+port.toString())
        await fastify.listen({ port, host: "0.0.0.0" })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
