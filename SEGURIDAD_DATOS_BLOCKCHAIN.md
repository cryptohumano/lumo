# Seguridad de Datos en Blockchain

## ⚠️ IMPORTANTE: Los Datos NO Están Encriptados

### Estado Actual

Los datos de emergencia enviados a la blockchain usando `System::remarkWithEvent` **NO están encriptados**. Están:

1. **Comprimidos**: Usando nombres de campos cortos (`v`, `t`, `s`, `lat`, `lng`, `ts`, `m`) para reducir el costo de la transacción
2. **Codificados como JSON**: Los datos se convierten a JSON y luego a `Uint8Array` (bytes)
3. **Públicos**: Cualquier persona que lea la blockchain puede ver y decodificar estos datos

### Formato Actual de los Datos

```json
{
  "v": 1,                    // Versión
  "id": "emergency-id",      // ID de emergencia
  "t": 1,                    // Tipo (1=ACCIDENT, 2=MEDICAL, etc.)
  "s": 4,                    // Severidad (1=LOW, 4=CRITICAL)
  "lat": 12345678,           // Latitud * 1e6
  "lng": -87654321,          // Longitud * 1e6
  "ts": 1704067200,          // Timestamp en segundos
  "m": {                     // Metadata
    "t": "Título",           // Title
    "d": "Descripción",      // Description
    "n": 1,                  // Number of people
    "a": "Dirección",        // Address
    "c": "Ciudad",           // City
    "co": "País"            // Country
  }
}
```

### Implicaciones de Seguridad

✅ **Ventajas**:
- Datos verificables e inmutables
- Transparente y auditable
- No requiere servidor centralizado
- Resistente a censura

⚠️ **Desventajas**:
- **Datos completamente públicos**: Cualquiera puede ver ubicación, tipo de emergencia, etc.
- **Sin privacidad**: Información sensible expuesta públicamente
- **Rastreable**: Las direcciones de wallet pueden ser rastreadas

### Opciones para Mejorar la Privacidad

Si necesitas encriptación, considera:

1. **Encriptación Simétrica (Clave Compartida)**:
   - Encriptar los datos antes de enviarlos a la blockchain
   - Solo autoridades con la clave pueden decodificar
   - Requiere distribución segura de claves

2. **Encriptación Asimétrica (Clave Pública)**:
   - Encriptar con la clave pública de las autoridades
   - Solo las autoridades pueden decodificar con su clave privada
   - Más seguro pero más complejo

3. **Hash de Datos Sensibles**:
   - Enviar solo hash de datos sensibles
   - Los datos completos se almacenan fuera de la blockchain
   - Requiere un sistema de almacenamiento externo

4. **Usar un Pallet Personalizado**:
   - Crear un pallet específico con encriptación integrada
   - Requiere desarrollo de runtime personalizado

### Recomendación Actual

Para emergencias críticas, el sistema actual es **suficiente** porque:
- Las emergencias necesitan ser visibles para las autoridades
- La transparencia ayuda a la auditoría
- La inmutabilidad garantiza que los datos no se modifiquen

Si necesitas privacidad adicional, considera encriptar solo campos sensibles (como descripciones detalladas) antes de enviarlos.

### Cómo Leer los Datos (Para Autoridades)

Los datos son completamente legibles usando:

1. **Backend Listener** (`emergencyBlockchainListener.ts`): Detecta automáticamente emergencias
2. **Decoder Service** (`emergencyBlockchainDecoder.ts`): Decodifica eventos desde bloques específicos
3. **API REST** (`/api/emergency-blockchain/*`): Permite a autoridades consultar eventos

Cualquier persona con acceso a un nodo de la blockchain puede hacer lo mismo.

