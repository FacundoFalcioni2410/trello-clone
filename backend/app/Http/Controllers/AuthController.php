<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller {

    public function register(Request $request) {
        $request->validate([
            "name"=> ['required', 'string'],
            "email"=> ['required', 'email'],
            'password'=> ['required'],
        ]);

        $user = User::create([
            'name'=> $request->name,
            'email'=> $request->email,
            'password'=> Hash::make($request->password),
        ]);
                        

        return response()->json([
            'status'=> 'success',
            'message'=> 'User registered'
        ]);
    }

    public function login(Request $request) {
        $credentials = $request->validate([
            "email"=> ['required', 'email'],
            'password'=> ['required'],
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'error' => 'Wrong credentials',
            ],401);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => Auth::user()
        ]);
    }

    public function logout(Request $request) {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out'
        ]);
    }
}
?>