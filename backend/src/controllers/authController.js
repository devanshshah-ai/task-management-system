const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { registerSchema,loginSchema} = require("../validators/authValidator");

const registerAdmin = async (req, res) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const { name, email, password } = validationResult.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while registering the admin",
    });
  }
};

const loginAdmin = async (req,res) => {
    try {
        const validationResult = loginSchema.safeParse(req.body);
        if(!validationResult){
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.issues.map((issue) => ({
                    field: issue.path[0],
                    message: issue.message,
                })),
            });
        }
        const {email,password} = validationResult.data;
        const existingUser = await User.findOne({ email }).select("+password");
        if(!existingUser){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        const isPasswordValid = await bcrypt.compare(password,existingUser.password);
        if(!isPasswordValid){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        
        const token = jwt.sign(
            {
                userId: existingUser._id,
                role: existingUser.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                },
            },
        });
    } catch (error) {
        console.log("Login Error",error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while logging in",
        });
    }
};

const getCurrentUser = async (req,res) => {
    try {
        const user = await User.findById(req.user.userId);
        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found",
        });
        }
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getCurrentUser,
};