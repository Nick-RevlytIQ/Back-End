const router = require('express').Router();
const { registerUser, loginUser, googleAuth, getUser } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/getUser', getUser);
router.post('/google', googleAuth);

module.exports = router;