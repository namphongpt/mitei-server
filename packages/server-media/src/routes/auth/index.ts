import { AuthType, User, UserDocument, UserKind } from '@mitei/server-models';
import { Router } from 'express';
import * as passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { config } from '../../config';
import { authLogger } from '../../utils/logging';

passport.use(
  new TwitterStrategy(
    {
      consumerKey: config.twitter.consumerKey,
      consumerSecret: config.twitter.consumerSecret,
      callbackURL: `${config.appUrl}/auth/callback/twitter`,
    },
    async (token, tokenSecret, profile, done) => {
      authLogger.info('new login', profile.id, profile.name);
      try {
        const user = await User.findOne({
          userId: profile.id,
          type: 'twitter',
        });
        if (user) {
          user.iconUrl = profile.photos ? profile.photos[0].value : '';
          user.token = token;
          user.tokenSecret = tokenSecret;
          user.screenName = profile.username;

          await user.save();
          return done(null, user);
        }

        const userNew = new User();
        userNew.userId = profile.id;
        userNew.kind = UserKind.Normal;
        userNew.type = AuthType.Twitter;
        userNew.iconUrl = profile.photos ? profile.photos[0].value : '';
        userNew.token = token;
        userNew.tokenSecret = tokenSecret;
        userNew.screenName = profile.username;

        await userNew.save();

        return done(null, userNew);
      } catch (err) {
        done(err);
      }
    },
  ),
);

passport.serializeUser((user: UserDocument, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId: string, done) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      done(null, user);
    } else {
      done('no user');
    }
  } catch (err) {
    done(err);
  }
});

export const router = Router();

router.use(
  '/callback/twitter',
  passport.authenticate('twitter'),
  (req, res) => {
    if (req.session && req.session.redirect) {
      res.redirect(req.session.redirect);
    } else {
      res.redirect('/');
    }
  },
);

router.use(
  '/login/twitter',
  (req, res, next) => {
    if (!req.session) return next();
    if (req.isAuthenticated()) return res.redirect('/');
    const { redirect }: { redirect?: string } = req.query;
    if (redirect && redirect.startsWith('/')) {
      if (req.session) {
        req.session.redirect = redirect;
      }
    }
    return next();
  },
  passport.authenticate('twitter'),
);