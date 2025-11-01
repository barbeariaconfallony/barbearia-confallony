# 📱 Configuração de Notificações para Android

## 🎯 Configurações Necessárias

### 1. google-services.json

Este arquivo conecta seu app Android ao Firebase. Você precisa:

1. Acessar [Firebase Console](https://console.firebase.google.com)
2. Selecionar projeto: **barbearia-confallony**
3. Ir em **Project Settings** (ícone de engrenagem)
4. Aba **General** > **Your apps**
5. Clicar em **Android** (ou adicionar app Android se não existir)
6. Baixar `google-services.json`
7. Colocar em: `android/app/google-services.json`

### 2. AndroidManifest.xml

Adicionar permissões em `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissões para notificações -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <!-- ... outras configurações ... -->

        <!-- Firebase Cloud Messaging Service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- Notification Channel padrão -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="agendamentos" />

    </application>
</manifest>
```

### 3. build.gradle (Project Level)

Arquivo: `android/build.gradle`

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'com.google.gms:google-services:4.4.0'  // Firebase
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

### 4. build.gradle (App Level)

Arquivo: `android/app/build.gradle`

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'  // Firebase plugin

android {
    namespace "app.lovable.confa106266_73093"
    compileSdk 34
    
    defaultConfig {
        applicationId "app.lovable.confa106266_73093"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    
    // ... outras configurações ...
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    
    // Capacitor
    implementation project(':capacitor-android')
    implementation project(':capacitor-push-notifications')
    
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.google.firebase:firebase-analytics'
    
    // ... outras dependências ...
}
```

### 5. Notification Channel (strings.xml)

Arquivo: `android/app/src/main/res/values/strings.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Confallony</string>
    <string name="title_activity_main">Confallony</string>
    <string name="package_name">app.lovable.confa106266_73093</string>
    
    <!-- Notification Channels -->
    <string name="notification_channel_agendamentos_name">Agendamentos</string>
    <string name="notification_channel_agendamentos_description">Notificações sobre seus agendamentos</string>
    <string name="notification_channel_lembretes_name">Lembretes</string>
    <string name="notification_channel_lembretes_description">Lembretes da fila de atendimento</string>
</resources>
```

### 6. colors.xml

Arquivo: `android/app/src/main/res/values/colors.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#D4AF37</color>
    <color name="colorPrimaryDark">#B8941F</color>
    <color name="colorAccent">#D4AF37</color>
</resources>
```

## 🔔 Criar Notification Channel

O Android requer canais de notificação. Adicione em um service ou Activity:

**Kotlin** (`MainActivity.kt`):
```kotlin
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Canal para agendamentos
            val agendamentosChannel = NotificationChannel(
                "agendamentos",
                "Agendamentos",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificações sobre seus agendamentos"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 200, 100, 200)
                setShowBadge(true)
            }

            // Canal para lembretes
            val lembretesChannel = NotificationChannel(
                "lembretes",
                "Lembretes",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Lembretes da fila de atendimento"
                enableVibration(true)
            }

            // Registrar canais
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(agendamentosChannel)
            notificationManager.createNotificationChannel(lembretesChannel)
        }
    }
}
```

## 🧪 Testar Notificações

### Via ADB (Android Debug Bridge)

```bash
# 1. Verificar se o app está rodando
adb shell dumpsys activity activities | grep mResumedActivity

# 2. Enviar notificação de teste via FCM
# Use o Firebase Console > Cloud Messaging > Send test message

# 3. Verificar logs
adb logcat | grep -i "firebase"
adb logcat | grep -i "fcm"
adb logcat | grep -i "notification"

# 4. Verificar permissões
adb shell dumpsys package app.lovable.confa106266_73093 | grep permission
```

### Via Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Cloud Messaging
3. **Send your first message**
4. Preencha:
   - **Notification title**: Teste
   - **Notification text**: Mensagem de teste
   - **Target**: Android app
5. **Test on device** > Adicione o FCM token
6. **Send test message**

## 📊 Verificar Status

### Verificar se Firebase está configurado

```bash
# Verificar se google-services.json existe
ls -la android/app/google-services.json

# Verificar se plugin está aplicado
grep "google-services" android/app/build.gradle
```

### Verificar Token FCM no dispositivo

Adicione código temporário no app:

```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        Log.d("FCM", "Token: $token")
        // Toast para mostrar no dispositivo
        Toast.makeText(this, "Token: ${token.take(20)}...", Toast.LENGTH_LONG).show()
    }
}
```

## 🚨 Problemas Comuns

### Notificações não aparecem

1. **Verificar permissões**:
   - Configurações > Apps > Confallony > Notificações
   - Deve estar ATIVADO

2. **Verificar canal de notificação**:
   - Configurações > Apps > Confallony > Notificações
   - Verificar se canal "Agendamentos" existe

3. **Verificar google-services.json**:
   - Deve estar em `android/app/google-services.json`
   - `package_name` deve corresponder ao `applicationId`

4. **Rebuild completo**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx cap sync android
   npx cap run android
   ```

### Token não é gerado

1. **Verificar SHA-1/SHA-256 do app** no Firebase Console
2. **Verificar internet** no emulador/dispositivo
3. **Verificar logs**: `adb logcat | grep Firebase`

### App crasha ao receber notificação

1. **Verificar dependências do Firebase** estão corretas
2. **Verificar ícones** de notificação existem
3. **Verificar canais** foram criados antes de enviar notificação

## 📱 Recursos Adicionais

- [Firebase Cloud Messaging - Android](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
