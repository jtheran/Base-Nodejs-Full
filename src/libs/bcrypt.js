import bcrypt from 'bcryptjs';

export const encryptPass = async (pass) => {
    try{
        const salt = await bcrypt.genSalt();
        const passHash = await bcrypt.hash(pass, salt);

        if(!passHash){
            
            return null;
        }

        
        return passHash;
    }catch(err){
        
        return null;
    }
};

export const matchPass = async (pass, hash) => {
    try{
        const match = await bcrypt.compare(pass, hash);

        if(!match){
           
            return false;
        }

        
        return match;
    }catch(err){
      
        return null;
    }
};

