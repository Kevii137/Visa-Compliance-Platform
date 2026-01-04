import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: '#09090b' }}>
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(https://images.pexels.com/photos/3573383/pexels-photo-3573383.jpeg)',
          opacity: 0.15
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#09090b] via-[#09090b]/90 to-[#1e1b4b]" />
      
      {/* Content */}
      <div className="relative z-10 flex w-full">
        {/* Left Panel - Branding */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-24"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary/20 glow-primary">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">CompliancePulse</h1>
              <p className="text-muted-foreground">Agentic AI Compliance Platform</p>
            </div>
          </div>
          
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight text-white mb-6">
            Continuous Compliance<br />
            <span className="text-primary">Powered by AI Agents</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Monitor PCI DSS, GDPR, CCPA, and more with autonomous AI agents that never sleep. 
            Real-time risk detection, audit-ready evidence, and intelligent compliance assistance.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Frameworks', value: '5+', desc: 'Supported' },
              { label: 'Detection', value: '24/7', desc: 'Real-time' },
              { label: 'Accuracy', value: '99.2%', desc: 'Compliance' },
              { label: 'Response', value: '<1s', desc: 'Alert Time' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="p-4 rounded-lg glass-panel"
              >
                <p className="overline mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Right Panel - Login Form */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full lg:w-1/2 flex items-center justify-center p-8"
        >
          <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 mb-2 lg:hidden">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold">CompliancePulse</span>
              </div>
              <CardTitle className="text-2xl tracking-tight">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your compliance dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      data-testid="login-email-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      data-testid="login-password-input"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full glow-primary"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link 
                  to="/register" 
                  className="text-primary hover:underline font-medium"
                  data-testid="register-link"
                >
                  Create account
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
