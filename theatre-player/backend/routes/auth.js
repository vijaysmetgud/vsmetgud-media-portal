import express from "express";
import passport from "passport";

const router = express.Router();

router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    (req, res) => {
        res.redirect(process.env.CLIENT_URL);
    }
);

router.get("/api/auth/me", (req, res) => {

    if (!req.user) {
        return res.status(401).json({
            authenticated: false
        });
    }

    res.json({
        authenticated: true,
        user: req.user
    });

});

router.post("/logout", (req, res) => {

    req.logout(() => {

        req.session.destroy(() => {

            res.json({
                success: true
            });

        });

    });

});

export default router;
