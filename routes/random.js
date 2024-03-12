const bcrypt = require('bcrypt');
const saltRounds = 5;

async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        throw error;
    }
}

// Example usage:
const plainPassword = 'principal@123';
hashPassword(plainPassword)
    .then((hashedPassword) => {
        console.log('Hashed Password:', hashedPassword);
    })
    .catch((error) => {
        console.error('Error hashing password:', error);
    });
