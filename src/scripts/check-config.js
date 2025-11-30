// scripts/check-config.js
import config from '../config/config.js';

console.log('🔍 Verificando configuración...\n');

console.log('✅ Entorno:', config.app.env);
console.log('✅ Puerto:', config.app.port);


console.log('\n🔐 Autenticación:');
console.log('   ✅ JWT Secret:', config.auth.jwt.secret ? 'Configurado' : '❌ Faltante');
console.log('   ✅ Refresh Secret:', config.auth.refreshToken.secret ? 'Configurado' : '❌ Faltante');

console.log('\n🚀 Características:');
console.log('   ✅ Auditoría:', config.features.audit ? 'Activada' : 'Desactivada');
console.log('   ✅ Cache:', config.features.cache ? 'Activada' : 'Desactivada');
console.log('   ✅ Colas:', config.features.queue ? 'Activada' : 'Desactivada');
console.log('   ✅ Email:', config.features.email ? 'Activada' : 'Desactivada');
console.log('   ✅ WebSocket:', config.features.websocket ? 'Activada' : 'Desactivada');

console.log('\n🎯 Configuración verificada correctamente!');