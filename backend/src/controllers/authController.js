const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const AppError = require("../utils/AppError");

const {
  registerSchema,
  loginSchema,
} = require("../validators/authValidator");

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError("Validation failed", 400, {
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const { name, email, password } = validationResult.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new AppError(
        "An account with this email already exists",
        409
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    // Generate token immediately after registration
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
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
    throw error;
  }
};

// LOGIN USER / ADMIN
const login = async (req, res) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError("Validation failed", 400, {
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const { email, password } = validationResult.data;

    const existingUser = await User.findOne({ email }).select(
      "+password"
    );

    if (!existingUser) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
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
    throw error;
  }
};

// GET CURRENT USER
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new AppError("User not found", 404);
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
    throw error;
  }
};

module.exports = {
  registerUser,
  login,
  getCurrentUser,
};