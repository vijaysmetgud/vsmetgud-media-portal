import express from "express";
import passport from "../passport.js";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/"
  }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL);
  }
);

router.get("/user", (req, res) => {

    if(req.user)
        return res.json(req.user);

    res.status(401).json({
        message:"Not Logged In"
    });

});

router.get("/logout",(req,res)=>{

    req.logout(()=>{

        res.redirect(process.env.CLIENT_URL);

    });

});

export default router;
