'use client'

import React from "react"

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Camera, User, Mail, Shield, Building2, Loader2, Save, KeyRound } from 'lucide-react'

export default function PerfilPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const supabase = createClient()

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'manager': return 'Gerente'
      case 'user': return 'Usuario'
      default: return 'Usuario'
    }
  }

  const getRoleBadgeVariant = (role: string | undefined) => {
    switch (role) {
      case 'admin': return 'default'
      case 'manager': return 'secondary'
      default: return 'outline'
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem valida.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no maximo 2MB.',
        variant: 'destructive',
      })
      return
    }

    setIsUploadingAvatar(true)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If bucket doesn't exist, we'll store as base64 in the profile
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: base64 })
            .eq('id', user.id)

          if (updateError) throw updateError

          await refreshProfile()
          toast({
            title: 'Avatar atualizado',
            description: 'Sua foto de perfil foi atualizada com sucesso.',
          })
        }
        reader.readAsDataURL(file)
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        // Update profile with avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)

        if (updateError) throw updateError

        await refreshProfile()
        toast({
          title: 'Avatar atualizado',
          description: 'Sua foto de perfil foi atualizada com sucesso.',
        })
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: 'Erro ao atualizar avatar',
        description: 'Ocorreu um erro ao atualizar sua foto de perfil.',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    setIsUpdating(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informacoes foram atualizadas com sucesso.',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Ocorreu um erro ao atualizar suas informacoes.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas nao coincidem.',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) throw error

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso.',
      })
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: 'Erro ao alterar senha',
        description: 'Ocorreu um erro ao alterar sua senha.',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informacoes pessoais e configuracoes de conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Clique na imagem para alterar
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div 
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Avatar'} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">{profile?.full_name || 'Usuario'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant={getRoleBadgeVariant(profile?.role) as any}>
                {getRoleLabel(profile?.role)}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Formatos aceitos: JPG, PNG, GIF. Tamanho maximo: 2MB
            </p>
          </CardContent>
        </Card>

        {/* Profile Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informacoes Pessoais
            </CardTitle>
            <CardDescription>
              Atualize suas informacoes pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">O email nao pode ser alterado</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Funcao</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={getRoleLabel(profile?.role)}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Loja Vinculada</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={profile?.store_id ? 'Vinculado' : 'Nenhuma'}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alteracoes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Seguranca
            </CardTitle>
            <CardDescription>
              Gerencie sua senha e configuracoes de seguranca
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Digite a nova senha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirme a nova senha"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  variant="secondary"
                  className="w-full"
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Alterar Senha
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              A senha deve ter pelo menos 6 caracteres. Recomendamos usar uma combinacao de letras, numeros e simbolos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
