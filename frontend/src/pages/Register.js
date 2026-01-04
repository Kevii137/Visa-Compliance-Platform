import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Shield, Lock, Mail, User, AlertCircle, Building } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'compliance_officer'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name, formData.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'compliance_officer', label: 'Compliance Officer' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'regulator', label: 'Regulator (View Only)' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: '#09090b' }}>
      {/* Background */}
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
        {/* Left Panel */}
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
            Start Your Compliance<br />
            <span className="text-primary">Journey Today</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Join organizations leveraging AI agents for continuous compliance monitoring 
            across PCI DSS, GDPR, CCPA, LGPD, and AML/KYC frameworks.
          </p>
          
          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Multi-framework compliance monitoring' },
              { icon: Building, text: 'Multi-tenant architecture for enterprise' },
              { icon: User, text: 'Role-based access control' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-muted-foreground">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Right Panel - Register Form */}
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
              <CardTitle className="text-2xl tracking-tight">Create account</CardTitle>
              <CardDescription>
                Get started with your compliance platform
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
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="pl-10"
                      data-testid="register-name-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="pl-10"
                      data-testid="register-email-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                    <SelectTrigger data-testid="register-role-select">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="pl-10"
                      data-testid="register-password-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className="pl-10"
                      data-testid="register-confirm-password-input"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full glow-primary"
                  disabled={loading}
                  data-testid="register-submit-btn"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link 
                  to="/login" 
                  className="text-primary hover:underline font-medium"
                  data-testid="login-link"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
