const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');
const { hashPassword } = require('../utils/passwords');

const ASSETS_GAS = [
  { name: 'AIRE ACONDICIONADO', dept: 'ALMACEN/TIENDA' },
  { name: 'ARCON HIELO', dept: 'ALMACEN/TIENDA' },
  { name: 'ASEOS CABALLEROS', dept: 'ASEOS CLIENTES ESTACION' },
  { name: 'ASEOS SEÑORAS', dept: 'ASEOS CLIENTES ESTACION' },
  { name: 'ASPIRADOR 1', dept: 'LAVADERO' },
  { name: 'ASPIRADOR 2', dept: 'LAVADERO' },
  { name: 'BARRERA ENTRADA', dept: 'PARKING' },
  { name: 'BARRERA SALIDA', dept: 'PARKING' },
  { name: 'BOX 1', dept: 'LAVADERO' },
  { name: 'BOX 2', dept: 'LAVADERO' },
  { name: 'BOX 3', dept: 'LAVADERO' },
  { name: 'BOX 4', dept: 'LAVADERO' },
  { name: 'BOX 5  LAVADO CAMIONES', dept: 'LAVADERO' },
  { name: 'CAFETERA CAPSULAS', dept: 'ALMACEN/TIENDA' },
  { name: 'CASETA VIGILANTE PARKING', dept: 'PARKING' },
  { name: 'CONGELADOR BOLSAS HIELO', dept: 'ALMACEN/TIENDA' },
  { name: 'CONGELADOR HELADOS', dept: 'ALMACEN/TIENDA' },
  { name: 'DUCHA 1 (EMPLEADOS/CALDERAS)', dept: 'DUCHAS' },
  { name: 'DUCHA 2', dept: 'DUCHAS' },
  { name: 'DUCHA 3', dept: 'DUCHAS' },
  { name: 'DUCHA 4', dept: 'DUCHAS' },
  { name: 'DUCHA 5', dept: 'DUCHAS' },
  { name: 'DUCHA 6', dept: 'DUCHAS' },
  { name: 'DUCHA 7', dept: 'DUCHAS' },
  { name: 'ILUMINACION FAROLAS', dept: 'AREAS COMUNES' },
  { name: 'ILUMINACION PARKING', dept: 'PARKING' },
  { name: 'MAQUINA DE AIRE Y AGUA', dept: 'PISTA' },
  { name: 'NEVERA BEBIDAS', dept: 'ALMACEN/TIENDA' },
  { name: 'NEVERA SANDWICH', dept: 'ALMACEN/TIENDA' },
  { name: 'PAPELERAS', dept: 'PISTA' },
  { name: 'PUERTA 1', dept: 'PARKING' },
  { name: 'PUERTA 2', dept: 'PARKING' },
  { name: 'SURTIDOR 1 GOA/SP95', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 10 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 11 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 12 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 13 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 14 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 15 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 16 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 17 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 18 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 19 AdBLUE', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 2 GOA/SP95', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 3 GOA/SP95', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 4 GOA/SP95', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 5 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 6 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 7 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 8 GOA', dept: 'SURTIDORES' },
  { name: 'SURTIDOR 9 GOA', dept: 'SURTIDORES' },
  { name: 'TOTEM PRECIOS GRANDE', dept: 'PISTA' },
  { name: 'TOTEM PRECIOS PEQUEÑO', dept: 'PISTA' },
  { name: 'VALLA PERIMETRAL', dept: 'PARKING' },
  { name: 'VITRINAS', dept: 'ALMACEN/TIENDA' },
];

const ASSETS_POS = [
  { name: 'ABATIDOR', dept: 'COCINA' },
  { name: 'ARMARIO FRIO 15', dept: 'COCINA' },
  { name: 'ARMARIO FRIO 16', dept: 'COCINA' },
  { name: 'ARMARIO FRIO 17', dept: 'COCINA' },
  { name: 'ARMARIO FRIO 8', dept: 'COCINA' },
  { name: 'ARMARIO FRIO BLANCO 1', dept: 'COCINA' },
  { name: 'ARMARIO FRIO BLANCO 2', dept: 'COCINA' },
  { name: 'ARMARIO FRIO BLANCO 3', dept: 'COCINA' },
  { name: 'ASEOS CABALLEROS', dept: 'ASEOS CLIENTES RESTAURANTE' },
  { name: 'ASEOS DISCAPACITADOS', dept: 'ASEOS CLIENTES RESTAURANTE' },
  { name: 'ASEOS SEÑORAS', dept: 'ASEOS CLIENTES RESTAURANTE' },
  { name: 'BARBACOA/BRASA', dept: 'COCINA' },
  { name: 'BASCULA', dept: 'OBRADOR/CARNICERIA' },
  { name: 'BATIDORA 1 (Grande)', dept: 'COCINA' },
  { name: 'BATIDORA 2 (Mediana)', dept: 'COCINA' },
  { name: 'BATIDORA 3 (Pequeña)', dept: 'COCINA' },
  { name: 'BAÑO MARIA', dept: 'COCINA' },
  { name: 'CAFETERA 1 (PRINCIPAL)', dept: 'CAFETERIA/RESTAURANTE' },
  { name: 'CAFETERA 2 (SNACK)', dept: 'CAFETERIA/RESTAURANTE' },
  { name: 'CAMARA FRIO 13', dept: 'COCINA' },
  { name: 'CAMARA FRIO 5', dept: 'COCINA' },
  { name: 'CAMARA FRIO 6', dept: 'OBRADOR/CARNICERIA' },
  { name: 'CAMARA FRIO 9', dept: 'COCINA' },
  { name: 'CAMARAS BEBIDAS', dept: 'CAFETERIA/RESTAURANTE' },
  { name: 'CAMPANA EXTRACCION', dept: 'COCINA' },
  { name: 'CONGELADOR 1', dept: 'GENERAL' },
  { name: 'CONGELADOR 11', dept: 'COCINA' },
  { name: 'CONGELADOR 2', dept: 'GENERAL' },
  { name: 'CONGELADOR 3', dept: 'GENERAL' },
  { name: 'CONGELADOR 7', dept: 'OBRADOR/CARNICERIA' },
  { name: 'CONGELADOR Nº 19 (Panadería)', dept: 'PANADERIA' },
  { name: 'CORTADORA PATATAS', dept: 'OBRADOR/CARNICERIA' },
  { name: 'EMBUTIDORA', dept: 'OBRADOR/CARNICERIA' },
  { name: 'ENVASADORA NITROGENO', dept: 'COCINA' },
  { name: 'ENVASADORA OXIGENO', dept: 'COCINA' },
  { name: 'ENVASADORA VACIO', dept: 'OBRADOR/CARNICERIA' },
  { name: 'FOGONES BLOQUE 1', dept: 'COCINA' },
  { name: 'FOGONES BLOQUE 2', dept: 'COCINA' },
  { name: 'FREIDORA GRANDE', dept: 'COCINA' },
  { name: 'FREIDORA PEQUEÑA', dept: 'COCINA' },
  { name: 'FRIGO BARRA', dept: 'CAFETERIA/RESTAURANTE' },
  { name: 'HAMBUERGUESERA', dept: 'OBRADOR/CARNICERIA' },
  { name: 'HORNO 1', dept: 'COCINA' },
  { name: 'HORNO 2', dept: 'COCINA' },
  { name: 'HORNO 3', dept: 'COCINA' },
  { name: 'HORNO 4', dept: 'COCINA' },
  { name: 'HORNO PAN', dept: 'PANADERIA' },
  { name: 'LAVADORA DE TRAPOS', dept: 'COCINA' },
  { name: 'MESA FRIA', dept: 'COCINA' },
  { name: 'MICROONDAS 1', dept: 'COCINA' },
  { name: 'MICROONDAS 2', dept: 'COCINA' },
  { name: 'MICROONDAS 3', dept: 'COCINA' },
  { name: 'MICROONDAS 4', dept: 'COCINA' },
  { name: 'MICROONDAS 5', dept: 'COCINA' },
  { name: 'MICROONDAS BARRA', dept: 'CAFETERIA/RESTAURANTE' },
  { name: 'PAELLEROS 1/2/3', dept: 'COCINA' },
  { name: 'PAELLEROS 4/5/6', dept: 'COCINA' },
  { name: 'PICADORA', dept: 'OBRADOR/CARNICERIA' },
  { name: 'PLANCHA ASAR', dept: 'COCINA' },
  { name: 'POZAS FREGADERO', dept: 'LIMPIEZA RESTAURANTE' },
  { name: 'SALAMANDRA GRATINADO', dept: 'COCINA' },
  { name: 'SECADORA CUBIERTOS', dept: 'LIMPIEZA RESTAURANTE' },
  { name: 'SIERRA CORTE', dept: 'PANADERIA' },
  { name: 'SIERRA CORTE CARNICERIA', dept: 'OBRADOR/CARNICERIA' },
  { name: 'TREN LAVADO', dept: 'LIMPIEZA RESTAURANTE' },
  { name: 'ZUMERA', dept: 'CAFETERIA/RESTAURANTE' },
];

const AVERIAS = [
  { fecha: '06/10/2025', titulo: 'Surtidor Dieciséis...', desc: 'salta la pistola...', tipo: 'ATASCO', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '16/10/2025', titulo: 'Prueba...', desc: 'Prueba...', tipo: 'DESGASTE', maquina: 'SURTIDOR 1 GOA/SP95', operario: 'Raquel Diaz', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '21/10/2025', titulo: 'Reparación...', desc: 'Manguera rota...', tipo: 'ROTURA', maquina: 'SURTIDOR 6 GOA', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '09/11/2025', titulo: 'Surtidor 1...', desc: 'Gotea manguera G.A...', tipo: 'DESGASTE', maquina: 'SURTIDOR 1 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '19/11/2025', titulo: 'Jhgg...', desc: 'Es una prueba...', tipo: 'ROTURA', maquina: 'SURTIDOR 12 GOA', operario: 'Roberto Coll', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '24/11/2025', titulo: 'Surtidores...', desc: 'Se quejan de que va lento el suministro...', tipo: 'ATASCO', maquina: 'SURTIDOR 8 GOA', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '25/11/2025', titulo: 'Surtidores...', desc: 'Las tapas del adblue 17, surtidor 3, 9, 10 y 12 es...', tipo: 'ROTURA', maquina: 'SURTIDOR 17 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '05/12/2025', titulo: 'Surtidores...', desc: 'La pistola de adblue número 16 salta todo el rato...', tipo: 'DESGASTE', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '10/12/2025', titulo: 'Surtidores...', desc: 'Se a roto la manguera...', tipo: 'ROTURA', maquina: 'SURTIDOR 5 GOA', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '14/12/2025', titulo: 'Adblue gemelo 16...', desc: 'No dispara cuando está lleno y se sale todo...', tipo: 'DESGASTE', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '15/12/2025', titulo: 'Surtidores...', desc: 'La manguera gotea...', tipo: 'ROTURA', maquina: 'SURTIDOR 17 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '05/01/2026', titulo: 'Manguera surtidor...', desc: 'Manguera de gasolina surtidor 1 desmontada...', tipo: 'ROTURA', maquina: 'SURTIDOR 1 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '05/01/2026', titulo: 'Sp95 n1...', desc: 'Han arrancado el boquerel de la gasolina...', tipo: 'ROTURA', maquina: 'SURTIDOR 1 GOA/SP95', operario: 'Sergio Aznar', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '12/01/2026', titulo: 'Surtidor 2 gotea...', desc: 'Mangueras de surtidor 2 gotean...', tipo: 'DESGASTE', maquina: 'SURTIDOR 2 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '18/01/2026', titulo: 'Surtidor 2...', desc: 'En el segundo surtidor, la primera manguera que ll...', tipo: 'ROTURA', maquina: 'SURTIDOR 2 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/01/2026', titulo: 'Surtidor 4...', desc: 'La manguera de diesel surtidor4 rota...', tipo: 'ROTURA', maquina: 'SURTIDOR 4 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '23/01/2026', titulo: 'Surtidores...', desc: 'la manguera de diesel del surtidor 2 la que esta c...', tipo: 'DESGASTE', maquina: 'SURTIDOR 2 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '02/02/2026', titulo: 'Surtidor...', desc: 'La manguera de diesel del surtidor 1 gotea...', tipo: 'DESGASTE', maquina: 'SURTIDOR 1 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '11/02/2026', titulo: 'ADBLUE...', desc: 'Se sale el adblue...', tipo: 'ROTURA', maquina: 'SURTIDOR 15 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '19/02/2026', titulo: 'Surtidores...', desc: 'En el surtidor 17 parpadea la luz del visor...', tipo: 'DESGASTE', maquina: 'SURTIDOR 17 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '23/02/2026', titulo: 'Surtidor 5...', desc: 'Salta todo el r at O...', tipo: 'ROTURA', maquina: 'SURTIDOR 5 GOA', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '23/02/2026', titulo: 'Adblur 13/14 tapa...', desc: '', tipo: 'ROTURA', maquina: 'SURTIDOR 14 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '24/02/2026', titulo: 'Surtidor 2...', desc: 'Pierde la maguera de diesel...', tipo: 'ROTURA', maquina: 'SURTIDOR 2 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '04/03/2026', titulo: 'Marca boquerel descolgado...', desc: 'Marca el boquerel todo el rato que esta descolgado...', tipo: 'ROTURA', maquina: 'SURTIDOR 9 GOA', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '10/03/2026', titulo: 'Surtidor 2...', desc: 'La pistola de diesel del surtidor 2 gotea...', tipo: 'ROTURA', maquina: 'SURTIDOR 2 GOA/SP95', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '13/03/2026', titulo: 'Adblue 17 gemelo...', desc: 'Gotea la manguera...', tipo: 'ROTURA', maquina: 'SURTIDOR 17 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '18/03/2026', titulo: 'Surtidor...', desc: 'Esta roto el plastico del gatillo y nomsevpuede de...', tipo: 'ROTURA', maquina: 'SURTIDOR 12 GOA', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '23/03/2026', titulo: 'Surtidores...', desc: 'Gotea la manguera y se llena todo de adblue...', tipo: 'ROTURA', maquina: 'SURTIDOR 17 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '24/03/2026', titulo: 'Surtidores...', desc: 'Un cliente estaba repostando adblue y cuandon a id...', tipo: 'ROTURA', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '25/03/2026', titulo: 'Surtidores...', desc: 'Se a soltado el boquerel, la hemos puesto fuera de...', tipo: 'ROTURA', maquina: 'SURTIDOR 12 GOA', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '26/03/2026', titulo: 'Adblue 17 gemelo...', desc: 'Va muy mal salta todo el rato...', tipo: 'ROTURA', maquina: 'SURTIDOR 17 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '14/04/2026', titulo: 'Surtidor...', desc: 'La manguera del adblue 16...', tipo: 'ROTURA', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '14/04/2026', titulo: 'Surtidores...', desc: 'Le falta la carcasa al boquerel del surtidor 18...', tipo: 'ROTURA', maquina: 'SURTIDOR 18 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '15/04/2026', titulo: 'Surtidores...', desc: 'La manguera de adblue del surtidor 18 esta muy des...', tipo: 'DESGASTE', maquina: 'SURTIDOR 18 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '16/04/2026', titulo: 'El adblue  del número  16 geme...', desc: 'Se sale el adblue 16 gemelo  cuando se reposta con...', tipo: 'ROTURA', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '16/04/2026', titulo: 'Adblue 16 gemelo...', desc: 'Se sale el adblue  16 gemelo  cuando  echan von la...', tipo: 'ROTURA', maquina: 'SURTIDOR 16 AdBLUE', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '21/04/2026', titulo: 'Manguera surtidor 12...', desc: '', tipo: 'DESGASTE', maquina: 'SURTIDOR 12 GOA', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'No finalizado' },
  { fecha: '11/12/2025', titulo: 'Jueves 11 Lute rotuser...', desc: 'Gestionar maquina elevadora totem grande...', tipo: 'ROTURA', maquina: 'TOTEM PRECIOS GRANDE', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/01/2026', titulo: 'PAPELERAS PISTA...', desc: 'rotura por aire...', tipo: 'ROTURA', maquina: 'PAPELERAS', operario: 'Roberto Coll', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '21/01/2026', titulo: 'Interruptor zona descarga cist...', desc: 'No funciona bien el interruptor de la zona de las ...', tipo: 'ROTURA', maquina: 'PAPELERAS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '27/03/2026', titulo: 'Papelera...', desc: 'La papelera que hay saliendo a ia pista a la izqui...', tipo: 'ROTURA', maquina: 'PAPELERAS', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '07/04/2026', titulo: 'Cabiar tapa monolito...', desc: 'Sustituir la tapa de cables...', tipo: 'ROTURA', maquina: 'TOTEM PRECIOS PEQUEÑO', operario: 'Raquel Diaz', urgency: 'Media', estado: 'No finalizado' },
  { fecha: '31/10/2025', titulo: 'Valla del parking...', desc: 'Rotura valla por vandalismo. Reparar urgente....', tipo: 'ROTURA', maquina: 'VALLA PERIMETRAL', operario: 'Roberto Coll', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '05/11/2025', titulo: 'Parking camiones puerta fondo...', desc: '', tipo: 'ROTURA', maquina: 'VALLA PERIMETRAL', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '10/11/2025', titulo: 'Valla parking camiones...', desc: 'Colocar vallas parking camiones...', tipo: 'ROTURA', maquina: 'VALLA PERIMETRAL', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '13/12/2025', titulo: 'Bombín puerta del parking...', desc: '', tipo: 'ROTURA', maquina: 'PUERTA 1', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '14/12/2025', titulo: 'Puerta peatonal...', desc: 'No abre la puerta...', tipo: 'ROTURA', maquina: 'PUERTA 1', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '18/12/2025', titulo: 'Puerta parking bombin...', desc: '', tipo: 'ROTURA', maquina: 'PUERTA 1', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '18/12/2025', titulo: 'Bombin puerta parking...', desc: '', tipo: 'ROTURA', maquina: 'PUERTA 1', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '18/12/2025', titulo: 'Bombin puerta parking...', desc: '', tipo: 'ROTURA', maquina: 'PUERTA 1', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '06/02/2026', titulo: 'Barreras parking camiones...', desc: 'Con el pico de tensión la barrera de entrada no se...', tipo: 'ROTURA', maquina: 'BARRERA ENTRADA', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '22/03/2026', titulo: 'Arreglar  luz de garita guardi...', desc: 'Ni hay  luz  en la garita del  guardia...', tipo: 'DESGASTE', maquina: 'CASETA VIGILANTE PARKING', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '16/01/2026', titulo: 'Tuberia agua caliente techo tr...', desc: 'Gotea la tubería del agua caliente vieja por desga...', tipo: 'DESGASTE', maquina: 'TREN LAVADO', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '21/01/2026', titulo: 'Grifo cuarto cacerolas...', desc: 'Se ha desgastado de uso el grifo de donde esta la ...', tipo: 'DESGASTE', maquina: 'POZAS FREGADERO', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '24/10/2025', titulo: 'Lavadero...', desc: '', tipo: 'ROTURA', maquina: 'BOX 4', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '30/10/2025', titulo: 'Lavadero...', desc: '', tipo: 'ROTURA', maquina: 'BOX 1', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '30/10/2025', titulo: 'Lavadero...', desc: 'Se disparan luces del lavadero...', tipo: 'ROTURA', maquina: 'BOX 2', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '01/11/2025', titulo: 'Lavadero...', desc: 'Box 4 fuera  de servicio, se traga las monedas...', tipo: '--', maquina: 'BOX 4', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '03/11/2025', titulo: 'Lavadero...', desc: 'Hechas monedas o euros los coge pero no arranca....', tipo: 'ROTURA', maquina: 'BOX 4', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '03/11/2025', titulo: 'Lavadero...', desc: 'No a salido el producto rosa, lo he probado en el ...', tipo: 'ROTURA', maquina: 'BOX 3', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '06/11/2025', titulo: 'Box3...', desc: 'No sale desengrasante rosa. Cambio electroválvula ...', tipo: 'ROTURA', maquina: 'BOX 3', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '17/11/2025', titulo: 'Bomba camiones...', desc: 'Casquillo "loco" partido. Perdida agua en la bomba...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '18/11/2025', titulo: 'Grifo final lavadero camiones...', desc: 'Gotea, no cierra bien....', tipo: 'DESGASTE', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '19/11/2025', titulo: 'Prueba care...', desc: 'Funciona perfecto es una prueba...', tipo: 'ATASCO', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Roberto Coll', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '24/11/2025', titulo: 'Lavadero  box 4...', desc: '', tipo: '--', maquina: 'BOX 4', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '26/11/2025', titulo: 'Lavadero...', desc: 'Hechan el euro empieza a contar y no sale nada...', tipo: 'ROTURA', maquina: 'BOX 4', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '04/12/2025', titulo: 'Pistola box2 doblada...', desc: 'He estado doblada pero no gotea mirar cuando podái...', tipo: 'ROTURA', maquina: 'BOX 2', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '10/12/2025', titulo: 'Box camiones perdida presion...', desc: 'Bomba camiones con presion a 70 (debe estar a 100)...', tipo: 'DESGASTE', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '17/12/2025', titulo: 'Lavadero...', desc: 'Se a reventado la lanza de la izquierda...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '18/12/2025', titulo: 'Lavadero...', desc: 'El monedero no funciona devuelve las monedas...', tipo: 'ATASCO', maquina: 'BOX 1', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '26/12/2025', titulo: 'Boca aspirador 1...', desc: 'Boca nueva completa. La habia pisado con un coche...', tipo: 'ROTURA', maquina: 'ASPIRADOR 1', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '02/01/2026', titulo: 'Box 4...', desc: 'No sale agua...', tipo: 'ROTURA', maquina: 'BOX 4', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '03/01/2026', titulo: 'Lavadero camiones...', desc: 'No coge las monedas las devuelve lo ponemos fuera ...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '10/01/2026', titulo: 'Box 3...', desc: 'El box 3 se traga las monedas...', tipo: 'ATASCO', maquina: 'BOX 3', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '12/01/2026', titulo: 'Lavadero...', desc: 'No se encienden las luces...', tipo: 'ROTURA', maquina: 'BOX 1', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/01/2026', titulo: 'Bomba camiones pierde agua...', desc: 'Pierde agua la bomba por el racor "loco" de la sal...', tipo: 'DESGASTE', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '24/01/2026', titulo: 'Lavaderos...', desc: 'No hay luz y los pongo fuera de servicio...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '24/01/2026', titulo: 'Aspirador...', desc: 'No tiene fuerza lo pongo fuera de servicio...', tipo: 'ROTURA', maquina: 'ASPIRADOR 1', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '11/02/2026', titulo: 'Lavadero...', desc: 'Ha empezando a salir agua donde se mezcla el jabón...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '18/02/2026', titulo: 'Lavadero...', desc: 'Se atascan las monedas  del lavadero de  camiones,...', tipo: 'ATASCO', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '04/03/2026', titulo: 'Lavadero camiones...', desc: 'Lleva una raja la manguera derecha...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '16/03/2026', titulo: 'Bomba camiones...', desc: 'Pierde aceite la cabeza de la bomba (muy poco, sin...', tipo: 'ROTURA', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '23/03/2026', titulo: 'LAVADERO...', desc: 'Falta el boton de aclarado...', tipo: 'ROTURA', maquina: 'BOX 2', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '24/03/2026', titulo: 'Brazo giroscopio Box 1...', desc: 'Gotea el casquillo giroscopio del brazo de arriba...', tipo: 'ROTURA', maquina: 'BOX 1', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '15/04/2026', titulo: 'averia camaras...', desc: 'camras de seguridad que no se ven 12 17 y  20...', tipo: 'ELECTRICA', maquina: 'BOX 1', operario: 'Roberto Coll', urgency: 'Alta', estado: 'No finalizado' },
  { fecha: '21/04/2026', titulo: 'Lavadero camiones...', desc: 'Pistola dcha principal perdia la lanza. Pistola se...', tipo: 'DESGASTE', maquina: 'BOX 5  LAVADO CAMIONES', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'No finalizado' },
  { fecha: '08/10/2025', titulo: 'Duchas...', desc: 'La ducha 7 no tiene el filtro ....', tipo: 'DESGASTE', maquina: 'DUCHA 7', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/10/2025', titulo: 'Ducha 2 y 4 se sale el agua po...', desc: '', tipo: 'DESGASTE', maquina: 'DUCHA 2', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/10/2025', titulo: 'Baño 1...', desc: 'El interruptor  de la luz no va...', tipo: 'ROTURA', maquina: 'DUCHA 1 (EMPLEADOS/CALDERAS)', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '16/10/2025', titulo: 'Ducha...', desc: 'La ducha 7 está atascada...', tipo: 'ATASCO', maquina: 'DUCHA 7', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/10/2025', titulo: 'Gasolinera...', desc: 'Perdida de agua caliente y fría en la ducha 1...', tipo: 'DESGASTE', maquina: 'DUCHA 1 (EMPLEADOS/CALDERAS)', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '12/11/2025', titulo: 'Duchas...', desc: 'Gotea la tubería que hay pegada al inodoro, hemos ...', tipo: 'ROTURA', maquina: 'DUCHA 5', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '13/11/2025', titulo: 'Ducha...', desc: 'Hay bichitos negros en las esquinas de la ducha y ...', tipo: 'DESGASTE', maquina: 'DUCHA 4', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '17/11/2025', titulo: 'Duchas...', desc: 'El grifo de agua caliente de la ducha 1, no cierra...', tipo: 'ROTURA', maquina: 'DUCHA 1 (EMPLEADOS/CALDERAS)', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '05/12/2025', titulo: 'Ducha...', desc: 'Ducha 7 atascada, no tiene filtro...', tipo: 'ATASCO', maquina: 'DUCHA 7', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '10/12/2025', titulo: 'Duchas...', desc: 'Ducha 4 se inunda, se sale el agua por la mampara...', tipo: 'DESGASTE', maquina: 'DUCHA 4', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '16/12/2025', titulo: 'Interruptor de ducha 1...', desc: 'Arreglar el interruptor  de la ducha 1 ,está atasc...', tipo: 'ROTURA', maquina: 'DUCHA 1 (EMPLEADOS/CALDERAS)', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/12/2025', titulo: 'Ducha  5 atascada...', desc: 'Ducha  5  atascada...', tipo: '--', maquina: 'DUCHA 5', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '13/01/2026', titulo: 'Ducha 4...', desc: 'La ducha cuatro no se puedevabrir, no entra la lla...', tipo: 'ROTURA', maquina: 'DUCHA 4', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '10/02/2026', titulo: 'Duchas...', desc: 'Lacducha 3 esta atascada y le falta el filtro...', tipo: 'ATASCO', maquina: 'DUCHA 3', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/02/2026', titulo: 'Ducha 4...', desc: 'No funciona la cadena del váter...', tipo: 'ROTURA', maquina: 'DUCHA 4', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '08/04/2026', titulo: 'Caldera ducha 1...', desc: 'Sale agua por un tubo de la caldera sin parar...', tipo: 'ROTURA', maquina: 'DUCHA 1 (EMPLEADOS/CALDERAS)', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/04/2026', titulo: 'Duchas...', desc: 'El bombin de la ducha 4 no va bien...', tipo: 'ATASCO', maquina: 'DUCHA 4', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '31/10/2025', titulo: 'Hola...', desc: 'Esto es una prueba que estoy haciendo con Roberto...', tipo: 'ROTURA', maquina: 'MICROONDAS 5', operario: 'Andrea Del Amo', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '05/11/2025', titulo: 'Paellero no funciona...', desc: 'No enciende...', tipo: 'ATASCO', maquina: 'PAELLEROS 1/2/3', operario: 'Carniceria Postas', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '06/11/2025', titulo: 'Batidora pequeña no va...', desc: 'Cambio enchufe batidora, partido...', tipo: 'ROTURA', maquina: 'BATIDORA 3 (Pequeña)', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/11/2025', titulo: 'Lavadora de trapos...', desc: 'Lavadora estropeada buscar sustitución...', tipo: 'ROTURA', maquina: 'LAVADORA DE TRAPOS', operario: 'Raquel Diaz', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '18/11/2025', titulo: 'Freidora no calienta...', desc: 'No calienta la freidora, termostato de seguridad r...', tipo: 'ROTURA', maquina: 'FREIDORA GRANDE', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '20/11/2025', titulo: 'Lavadora trapos...', desc: 'Sustitución de la lavadora porque ya no tiene repa...', tipo: 'ROTURA', maquina: 'LAVADORA DE TRAPOS', operario: 'Raquel Diaz', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '24/11/2025', titulo: 'Mesa fria...', desc: 'Pierde agua...', tipo: 'ROTURA', maquina: 'MESA FRIA', operario: 'Juan Carlos Abad', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '01/12/2025', titulo: 'Baño Maria...', desc: 'Resistencia 2 (la del medio) rota. Nueva...', tipo: 'ROTURA', maquina: 'BAÑO MARIA', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '05/12/2025', titulo: 'Envasadora de oxigeno...', desc: 'No sube la temperatura en uno de los termostatos d...', tipo: 'ROTURA', maquina: 'ENVASADORA OXIGENO', operario: 'Carniceria Postas', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '14/12/2025', titulo: 'Microondas...', desc: 'No calienta...', tipo: 'ROTURA', maquina: 'MICROONDAS 3', operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'No finalizado' },
  { fecha: '14/12/2025', titulo: 'Freidora...', desc: 'No calienta...', tipo: 'ROTURA', maquina: 'FREIDORA GRANDE', operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '02/01/2026', titulo: 'Freidora...', desc: 'No calienta la freidora...', tipo: 'ROTURA', maquina: 'FREIDORA GRANDE', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '04/01/2026', titulo: 'Baño maria...', desc: '', tipo: 'ROTURA', maquina: 'BAÑO MARIA', operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '09/01/2026', titulo: 'Envasadora oxigeno...', desc: 'Salta la luz...', tipo: 'ROTURA', maquina: 'ENVASADORA OXIGENO', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '21/01/2026', titulo: 'Pistola manguera horno gas...', desc: 'Se ha roto la pistola, la maneta...', tipo: 'ROTURA', maquina: 'HORNO 4', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '23/01/2026', titulo: 'Camara 9 y 12...', desc: 'Limpieza, mantenimiento y saneamiento sistema eléc...', tipo: 'DESGASTE', maquina: 'CAMARA FRIO 9', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '23/01/2026', titulo: 'Camara 9 y 12...', desc: 'Limpieza, mantenimiento y saneamiento sistema eléc...', tipo: 'DESGASTE', maquina: 'CAMARA FRIO 9', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '06/02/2026', titulo: 'Baño Maria...', desc: 'No calienta ninguna resistencia del baño Maria...', tipo: 'ROTURA', maquina: 'BAÑO MARIA', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '06/02/2026', titulo: 'Tv camaras oficina...', desc: 'Con el pico de tensión, la tv de visualización de ...', tipo: 'ROTURA', maquina: 'LAVADORA DE TRAPOS', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '20/02/2026', titulo: 'Freirota...', desc: 'No calientan las resistencias...', tipo: 'ROTURA', maquina: 'FREIDORA GRANDE', operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '04/03/2026', titulo: 'Rejilla anticalorica bbq...', desc: 'Cambio de planchas por desgaste de uso...', tipo: 'DESGASTE', maquina: 'BARBACOA/BRASA', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '16/03/2026', titulo: 'Baño maria...', desc: 'Se dispara el diferencial...', tipo: 'ROTURA', maquina: 'BAÑO MARIA', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '23/03/2026', titulo: 'Envasadora oxigeno izquierda...', desc: 'No sella bien, pierde aire...', tipo: 'DESGASTE', maquina: 'ENVASADORA NITROGENO', operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '08/04/2026', titulo: 'Freidora n2...', desc: 'Se dispara la pia...', tipo: 'ROTURA', maquina: 'FREIDORA GRANDE', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '08/04/2026', titulo: 'Luz campana...', desc: 'No va la luz del medio de la campana grande....', tipo: 'ROTURA', maquina: 'CAMPANA EXTRACCION', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '13/04/2026', titulo: 'Horno 3...', desc: 'Se sobrecalienta el horno 3...', tipo: 'ROTURA', maquina: 'HORNO 3', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/04/2026', titulo: 'fteidora...', desc: 'no funciona...', tipo: 'ROTURA', maquina: 'FREIDORA GRANDE', operario: 'Todos Cocineros', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '15/04/2026', titulo: 'Barbacoa...', desc: 'Lado izquierdo  Pierde Gas...', tipo: 'ROTURA', maquina: 'BARBACOA/BRASA', operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '04/11/2025', titulo: 'Camara bebidas sala...', desc: 'Se ha pinchado la resistencia por exceso de bebida...', tipo: 'ROTURA', maquina: 'CAMARAS BEBIDAS', operario: 'Carniceria Postas', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '24/11/2025', titulo: 'Vitrina 2 cafeteria...', desc: 'No enfria...', tipo: 'ROTURA', maquina: 'FRIGO BARRA', operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '01/12/2025', titulo: 'Cafetera grande...', desc: 'Cafetera cacillos rotos Avisad proveedor...', tipo: 'ROTURA', maquina: 'CAFETERA 1 (PRINCIPAL)', operario: 'Raquel Diaz', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '09/12/2025', titulo: 'Jabonera baño hombres rest...', desc: 'He cambiado la tapa que se habia partido. Tener cu...', tipo: 'ROTURA', maquina: 'ASEOS CABALLEROS', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '04/11/2025', titulo: 'Baño hombres gasolinera...', desc: 'Se ha roto el asiento del ultimo baño de hombres g...', tipo: '--', maquina: 'ASEOS CABALLEROS', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '18/11/2025', titulo: 'Grifo pegado ventana...', desc: 'El grifo pegado a la ventana agunta poco rato el a...', tipo: 'DESGASTE', maquina: 'ASEOS CABALLEROS', operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '04/02/2026', titulo: 'Ambientadores...', desc: 'Hay que cambiar ambientadores aseos gasolinera y r...', tipo: 'DESGASTE', maquina: 'ASEOS CABALLEROS', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '04/03/2026', titulo: 'Baño caballeros...', desc: 'Atascado el inodoro de caballeros tienda...', tipo: 'ATASCO', maquina: 'ASEOS CABALLEROS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '04/03/2026', titulo: 'Aseos caballeros...', desc: 'Atasco inodoro...', tipo: 'ATASCO', maquina: 'ASEOS CABALLEROS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '30/12/2025', titulo: 'Se disparan diferenciales todo...', desc: 'Todos los días se disparan tienda ,cocina y garita...', tipo: 'ROTURA', maquina: 'ILUMINACION FAROLAS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '30/10/2025', titulo: 'Nevera sandwich...', desc: 'Tiene hielo...', tipo: 'DESGASTE', maquina: 'NEVERA SANDWICH', operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '27/11/2025', titulo: 'Luz led  revistas...', desc: 'Luz led revistas rota...', tipo: 'ROTURA', maquina: 'VITRINAS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '09/01/2026', titulo: 'Nevera...', desc: 'La nevera de embutidos tiene hielo...', tipo: 'ATASCO', maquina: 'NEVERA SANDWICH', operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '12/01/2026', titulo: 'Puerta baño restaurante...', desc: 'Puerta baños cafeteria no cierra...', tipo: 'ROTURA', maquina: 'VITRINAS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '04/02/2026', titulo: 'Cafetera dolce gusto...', desc: 'Pierde agua...', tipo: 'ROTURA', maquina: 'CAFETERA CAPSULAS', operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '25/09/2025', titulo: 'Filtros del grupo electrogeno...', desc: 'Cambio de filtros del generador por mantenimiento ...', tipo: 'DESGASTE', maquina: null, operario: 'Raquel Diaz', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '02/10/2025', titulo: 'Bomba 5...', desc: 'La bomba 5 no va bien, apenas baja. Hemos probado ...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '06/10/2025', titulo: 'Papelera...', desc: 'Papelera rota calle 3y4, se atasca al sacarla...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '08/10/2025', titulo: 'Baño hombres gasolinera...', desc: 'Se ha atascado el último baño. Dejamos cartel fuer...', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/10/2025', titulo: 'By pass riego...', desc: '', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '15/10/2025', titulo: 'Ducha...', desc: 'Se atasca el bombín...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '15/10/2025', titulo: 'Grifo pista...', desc: 'El grifo de la pista gotea sin parar...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '16/10/2025', titulo: 'Lavadero camiones...', desc: 'No para la bomba cuando tiene que parar...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '19/10/2025', titulo: 'Aspiradores...', desc: 'Aspirador roto...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '24/10/2025', titulo: 'Impresora...', desc: 'IImpresora de diferente modelo al que necesitamos,...', tipo: 'ATASCO', maquina: null, operario: 'Raquel Diaz', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '27/10/2025', titulo: 'Lavadero...', desc: 'No sale agua ni jabon...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '30/10/2025', titulo: 'TOTEM PRECIOS...', desc: 'FALLO EN ENVIO DE PRECIOS DE TPV A TOTEM...', tipo: 'ROTURA', maquina: null, operario: 'Roberto Coll', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '30/10/2025', titulo: 'Lavadero camiones (cambio 3 fo...', desc: '', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '31/10/2025', titulo: 'Surtidor 6...', desc: 'Han arrancado el boquerel del surtidor 6, Tenemos ...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '03/11/2025', titulo: 'Cámara 13...', desc: 'Se fue la luz y no volvio...', tipo: 'ELECTRICA', maquina: null, operario: 'Javier Martinez', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '03/11/2025', titulo: 'Toma tierra descarga combustib...', desc: 'Conectar toma tierra arrancada...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '05/11/2025', titulo: 'Mantenimiento y limpieza bbq...', desc: 'Desmontado pilotos rejillas y termopar y limpiados...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '06/11/2025', titulo: 'Cambio aceite bombas lavadero ...', desc: 'Mantenimiento de bombas 2, 3 y 5...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '10/11/2025', titulo: 'Llave de paso agua pista...', desc: '', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '10/11/2025', titulo: 'Cajón(caja)...', desc: '', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '12/11/2025', titulo: 'Chupete aspersor deposito buta...', desc: 'Cambio chupete riego (aspersor) roto...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '18/11/2025', titulo: 'Lavadoras...', desc: 'No funciona ni las monedas ni las tarjetas...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '19/11/2025', titulo: 'Grifo baños caballeros tienda...', desc: 'Grifo del lavabo no se corta el agua, hemos cortad...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '20/11/2025', titulo: 'Cámara 17...', desc: 'La Cámara 17, la imagen desparece alguna vez y lue...', tipo: '--', maquina: null, operario: 'Javier Martinez', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '20/11/2025', titulo: 'Puerta parking camiones...', desc: '', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '21/11/2025', titulo: 'BBQ de cocina...', desc: 'No pasa gas...', tipo: 'DESGASTE', maquina: null, operario: 'Raquel Diaz', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '24/11/2025', titulo: 'Vitrina barra 2...', desc: 'No enfría...', tipo: 'ROTURA', maquina: null, operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '25/11/2025', titulo: 'Valvula alivio lavadero...', desc: 'Pierde agua la valvula alivio calderin pequeño bla...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '25/11/2025', titulo: 'Camaras...', desc: 'La cámara 2 de pista no funciona bien, desde el ap...', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '25/11/2025', titulo: 'Perdida agua caldera almacen...', desc: 'Ya hemos encontrado por donde pierde agua, lo he d...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '26/11/2025', titulo: 'Interruptor de luz ducha 1...', desc: '', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '27/11/2025', titulo: 'Parking...', desc: 'En la cerradura de la puerta del parking han metid...', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '29/11/2025', titulo: 'Surtidor adblue...', desc: 'Surtidor 16 (la torre) al repostar gotea mucho...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '01/12/2025', titulo: 'Cajon caja registradora tienda...', desc: 'Cambio motor apertura electrónica cajon. Arreglado...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '02/12/2025', titulo: 'Adblue  14...', desc: 'No dispara la manguera  del  adblue  14 y se sale...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '05/12/2025', titulo: 'Luces lavadero...', desc: 'Salta el diferencial de alumbrado. He separado las...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '05/12/2025', titulo: 'Grifo cerveza...', desc: 'Sellar canto del grifo de cerveza nuevo para que n...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '07/12/2025', titulo: 'Baños caballeros gasolinera...', desc: 'El baño de caballeros está atascado...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/12/2025', titulo: 'Poste plastico parking...', desc: 'No se levanta...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/12/2025', titulo: 'Grifo cerveza...', desc: 'Sellar con silicona grifo cerveza...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/12/2025', titulo: 'Comprobacion aseos general...', desc: 'He comprobado todos urinarios y he tenido que desa...', tipo: 'ATASCO', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '10/12/2025', titulo: 'Lavadero...', desc: 'Se dispara la luz del lavadero ybtira las luces de...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '11/12/2025', titulo: 'Surtidor 5...', desc: 'El surtidor número 5 pierde gasoil...', tipo: 'DESGASTE', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '13/12/2025', titulo: 'Lavadoras...', desc: 'No funciona lo de las monedas...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '14/12/2025', titulo: 'Freidora...', desc: 'No calienta...', tipo: 'ROTURA', maquina: null, operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '19/12/2025', titulo: 'Envasadora oxigeno (display ar...', desc: 'Salta la luz con el display arreglado por que sube...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/12/2025', titulo: 'Congelador...', desc: 'El congelador de los helados la parte de arriba no...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '20/12/2025', titulo: 'Baños hombres  gasolinera...', desc: 'Atascado  baño hombres  gasolinera...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '22/12/2025', titulo: 'Desague fregadera tren lavado...', desc: 'Pierde agua el sifon del desague...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '22/12/2025', titulo: 'Adblue número 14 gotea...', desc: 'El adblue  del 14 pierde bastante...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/12/2025', titulo: 'Ducha 7...', desc: 'Se sale el agua de la cisterna del inodoro de la d...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '24/12/2025', titulo: 'Sonda de tanque 4 GoA...', desc: 'Sustitucion de sonda tanque 4. GoA...', tipo: 'ROTURA', maquina: null, operario: 'Raquel Diaz', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '26/12/2025', titulo: 'Bombines taquillas vestuario c...', desc: 'Taquillas adriana susana y noemi...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '26/12/2025', titulo: 'Cerraduras taquillas david y t...', desc: 'Nuevas...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '26/12/2025', titulo: 'Perchas vestuario chicos posta...', desc: 'Colocar 2 perchas dobles vestuario hombres postas...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '02/01/2026', titulo: 'Camara bebidas comedor...', desc: 'La ficha de empalme, que vino asi cuando se compro...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '02/01/2026', titulo: 'Grifo cocina...', desc: 'Pierde agua...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '03/01/2026', titulo: 'Puerta entrada...', desc: 'No se cierra esta bloqueada...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '03/01/2026', titulo: 'Lavaderos...', desc: 'No funciona los lavaderos...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '04/01/2026', titulo: 'Surtidor 2...', desc: 'El boquerel de gasóleo del surtidor 2 se ha girado...', tipo: '--', maquina: null, operario: 'Expendedores Tienda', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '07/01/2026', titulo: 'Tren de lavado...', desc: 'No sale seca la vajilla...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '07/01/2026', titulo: 'Grifo lavado perolas...', desc: 'Gotea el grifo...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '07/01/2026', titulo: 'Grifo lavabo tren lavado...', desc: 'Gotea el grifo derecho...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '07/01/2026', titulo: 'Poza grifo barra (vinos)...', desc: 'Gotea por la parte de abajo de la poza...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '07/01/2026', titulo: 'Lavadero...', desc: 'El lavadero no funciona, esta todo apagado. No le ...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '09/01/2026', titulo: 'Tren de lavado...', desc: 'No traga el vaciado del tren...', tipo: 'ATASCO', maquina: null, operario: 'Sergio Aznar', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '15/01/2026', titulo: 'Pistola agua horno grande rota...', desc: 'Se ha roto...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/01/2026', titulo: 'Tanque 6...', desc: 'Al descargar la cisterna sale el gasoleo por el ve...', tipo: 'MECANICA', maquina: null, operario: 'Roberto Coll', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '20/01/2026', titulo: 'Vaciar agua Boca de hombres...', desc: 'Agua en boca de hombres, sacar con bomba neumática...', tipo: 'ATASCO', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '22/01/2026', titulo: 'Puerta salida cocina-zonaverde...', desc: 'No se puede abrir la puerta desde dentro...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '22/01/2026', titulo: 'Trepaderas estructura metalica...', desc: 'Trabajos de poda y jardinería...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '23/01/2026', titulo: 'Crimpar cable kds...', desc: 'No llega conexion de datos (no imprime impresora)...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '25/01/2026', titulo: 'Lavadora grande...', desc: 'Sale toda la ropa sin centrifugar  la pongo fuera ...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '03/02/2026', titulo: 'Lavavajillas pequeño...', desc: 'No calienta el agua y no para...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '03/02/2026', titulo: 'Plancha doble pescado...', desc: 'Remodelacion plancha...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '05/02/2026', titulo: 'Luz de descarga...', desc: 'No funciona...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '06/02/2026', titulo: 'Cae un rayo y se fue la luz...', desc: 'Con el pico de tensión del dia 5/02 por la tarde, ...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '09/02/2026', titulo: 'CAFETERA...', desc: 'La cafetera de la derecha no funciona, no sale caf...', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '13/02/2026', titulo: 'Modem Centro Transformacion...', desc: 'El módem que conecta el consumo de Kwh en el Centr...', tipo: 'ROTURA', maquina: null, operario: 'Raquel Diaz', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '16/02/2026', titulo: 'ATASCO ASPIRADOR...', desc: 'NO LLEGAN LAS FICHAS A LA OFICINA...', tipo: 'MECANICA', maquina: null, operario: 'Roberto Coll', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '16/02/2026', titulo: 'Papelera calle 3/4...', desc: 'Se ha arrancado el cubo de basura...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '18/02/2026', titulo: 'Surtidores...', desc: 'Los surtidores van lentos...', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '20/02/2026', titulo: 'Freifora...', desc: 'No calienta...', tipo: 'ROTURA', maquina: null, operario: 'Juan Carlos Abad', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/02/2026', titulo: 'Impresora  y cajon...', desc: 'El cajon no abre y la impresora no saca tiket...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '26/02/2026', titulo: 'Balda fondo camara embutido...', desc: 'Baldas desgastadas por viejas, viniladas para lava...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '26/02/2026', titulo: 'Hitos abatibles parking carava...', desc: 'Colocar 8 hitos para que no aparquen camiones...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '26/02/2026', titulo: 'Sirga cable camaras...', desc: 'Colocar Shiga desde la farola hasta la zona de des...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '26/02/2026', titulo: 'Remodelacion lavadero...', desc: '-Sustitucion de latiguillos de los boxes por tubo ...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '01/03/2026', titulo: 'Lavadero...', desc: 'No sale agua caliente...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '05/03/2026', titulo: 'Puerta armario cuarto de posta...', desc: 'Esta rota la puerta...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '08/03/2026', titulo: 'KDS Cocina no entran comandas...', desc: 'KDS de cocina no entran comandas. Se han desviado ...', tipo: '--', maquina: null, operario: 'Raquel Diaz', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '10/03/2026', titulo: 'Puerta...', desc: 'Se a roto el muelle de la puerta de entrada a cafe...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '16/03/2026', titulo: 'Abrelatas grande...', desc: 'No abre las latas...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '17/03/2026', titulo: 'Limpieza y observacion evapora...', desc: 'Soplado, limpieza y observación de partes críticas...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/03/2026', titulo: 'Nevera latas barra cafet....', desc: 'No cierran las puertas de la nevera de las latas d...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/03/2026', titulo: 'Nevera latas barra cafet....', desc: 'No cierran las puertas de la nevera de las latas d...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/03/2026', titulo: 'Maquina cambio monedas...', desc: 'Se atascan las monedas y da moneda de menos...', tipo: 'ATASCO', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/03/2026', titulo: 'Colocar tele tienda con cable ...', desc: 'Pasar cable de luz y transmisión de datos, colocar...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '19/03/2026', titulo: 'MOSTRADOR...', desc: 'Esta levantado el suelo del mostrador, y nos trope...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '20/03/2026', titulo: 'Rejuntar tela asfaltica (goter...', desc: 'Se filtra agua por la pared...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '24/03/2026', titulo: 'Caldera Lavadero...', desc: 'Solicita Roberto a DH mantenimiento presupuesto de...', tipo: 'DESGASTE', maquina: null, operario: 'Raquel Diaz', urgency: 'Alta', estado: 'No finalizado' },
  { fecha: '26/03/2026', titulo: 'Chimenea...', desc: 'La chapa de arriba de la chimenea esta suelta de u...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '27/03/2026', titulo: 'Bomba neumatica boca hombres...', desc: 'La bomba neumática de sacar el agua de la boca de ...', tipo: 'ATASCO', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '27/03/2026', titulo: 'Camara congelacion 11...', desc: 'Goma ajuste puerta rota...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '27/03/2026', titulo: 'Mostrador...', desc: 'La tarima del medio del mostrador,  tiene partida ...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '28/03/2026', titulo: 'Camara pista...', desc: 'No funciona la cámara de pista...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '30/03/2026', titulo: 'Puerta cafeteria...', desc: 'Se a roto el muelle de la puerta de entrada a cafe...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '30/03/2026', titulo: 'Cartel desprendido del monolit...', desc: 'Cartel de monolito de Perromiralles (cercano a la ...', tipo: 'ROTURA', maquina: null, operario: 'Raquel Diaz', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '31/03/2026', titulo: 'Grupo electrogenos...', desc: 'No se enciende...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '01/04/2026', titulo: 'Bomba abastecimiento agua gene...', desc: 'No trabajaba bien la bomba. No cogia presion...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/04/2026', titulo: 'Chupetes riego...', desc: 'Lo ha arrancado Jesus...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '09/04/2026', titulo: 'Lavavajillas pequeño...', desc: 'Desde mi punto de vista no va bien, no llegar a co...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'No finalizado' },
  { fecha: '13/04/2026', titulo: 'Camaras bebida barra y restaur...', desc: 'No cierran bien las tapas...', tipo: 'DESGASTE', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '13/04/2026', titulo: 'Interruptor luz led debajo bar...', desc: 'Los que hicieron la instalación lo pusieron con ci...', tipo: '--', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/04/2026', titulo: 'Luz caseta seguridad parking...', desc: 'No va la luz de la caseta del vigilante...', tipo: 'ROTURA', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
  { fecha: '14/04/2026', titulo: 'Vestuario...', desc: 'El bombin del vestuario de las chicas esta roto, s...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'Finalizado' },
  { fecha: '15/04/2026', titulo: 'Extintores...', desc: 'El extintor de la calle 10 tiene la aguja por enci...', tipo: 'DESGASTE', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'No finalizado' },
  { fecha: '17/04/2026', titulo: 'Aeos...', desc: 'Una tapa del inodoro de señoras y otra de hombres ...', tipo: 'DESGASTE', maquina: null, operario: 'Expendedores Tienda', urgency: 'Media', estado: 'No finalizado' },
  { fecha: '20/04/2026', titulo: 'Puerta baños bar...', desc: '', tipo: 'DESGASTE', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '20/04/2026', titulo: 'Surtidores...', desc: 'Se quejan de que los surtidores 10-11  y 8-9 van l...', tipo: 'ATASCO', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '20/04/2026', titulo: 'Vestuario...', desc: 'El bombin da vueltas y cuesta mucho abrirby cerrar...', tipo: 'DESGASTE', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: '22/10/2025', titulo: 'Lavadero...', desc: 'Se a reventado la membrana de la osmosis...', tipo: 'ROTURA', maquina: null, operario: 'Expendedores Tienda', urgency: 'Alta', estado: 'Finalizado' },
  { fecha: null, titulo: 'Sin titulo', desc: '', tipo: 'OTRO', maquina: null, operario: 'Sergio Aznar', urgency: 'Baja', estado: 'Finalizado' },
];

const USERS = [
  { full_name: 'Sergio Aznar', role: 'ADMIN', username: 'sergio', password: 'demo2024' },
  { full_name: 'Roberto Coll', role: 'OPERATOR', username: 'roberto', password: 'demo2024' },
  { full_name: 'Raquel Diaz', role: 'OPERATOR', username: 'raquel', password: 'demo2024' },
];

const SPARE_PARTS = [
  { part_number: 'MAN-GOA-001', name: 'Manguera GOA/SP95', description: 'Manguera surtidor gasoil/gasolina', stock_current: 4, stock_min: 2, cost_price: 45.00, location: 'Almacen' },
  { part_number: 'MAN-ADU-001', name: 'Manguera AdBlue', description: 'Manguera surtidor AdBlue', stock_current: 3, stock_min: 2, cost_price: 38.00, location: 'Almacen' },
  { part_number: 'PIS-GOA-001', name: 'Pistola surtidor GOA', description: 'Pistola dispensadora gasoil', stock_current: 3, stock_min: 2, cost_price: 72.00, location: 'Almacen' },
  { part_number: 'PIS-ADU-001', name: 'Pistola surtidor AdBlue', description: 'Pistola dispensadora AdBlue', stock_current: 2, stock_min: 1, cost_price: 65.00, location: 'Almacen' },
  { part_number: 'JUN-001', name: 'Junta manguera', description: 'Junta de estanqueidad para conexion manguera', stock_current: 20, stock_min: 10, cost_price: 3.50, location: 'Almacen' },
  { part_number: 'FIL-GEN-001', name: 'Filtro aceite generador', description: 'Filtro aceite grupo electrogeno', stock_current: 2, stock_min: 1, cost_price: 18.00, location: 'Almacen' },
  { part_number: 'FIL-AIR-001', name: 'Filtro aire aspirador', description: 'Filtro aire aspirador lavadero', stock_current: 4, stock_min: 2, cost_price: 12.00, location: 'Almacen' },
];

async function ensureLocation(client, name) {
  const ex = await client.query('SELECT id FROM locations WHERE name = $1', [name]);
  if (ex.rows[0]) return ex.rows[0].id;
  const r = await client.query('INSERT INTO locations (name) VALUES ($1) RETURNING id', [name]);
  return r.rows[0].id;
}

async function ensureDepartment(client, locationId, name) {
  const ex = await client.query('SELECT id FROM departments WHERE location_id = $1 AND name = $2', [locationId, name]);
  if (ex.rows[0]) return ex.rows[0].id;
  const r = await client.query('INSERT INTO departments (location_id, name) VALUES ($1, $2) RETURNING id', [locationId, name]);
  return r.rows[0].id;
}

async function ensureAsset(client, deptId, name) {
  const ex = await client.query('SELECT id FROM assets WHERE dept_id = $1 AND name = $2', [deptId, name]);
  if (ex.rows[0]) return ex.rows[0].id;
  const r = await client.query('INSERT INTO assets (dept_id, name) VALUES ($1, $2) RETURNING id', [deptId, name]);
  return r.rows[0].id;
}

async function ensureUser(client, user, locationId) {
  const ex = await client.query('SELECT id FROM users WHERE username = $1', [user.username]);
  if (ex.rows[0]) return ex.rows[0].id;
  const hash = hashPassword(user.password);
  const r = await client.query(
    'INSERT INTO users (full_name, role, username, password_hash, location_id, active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id',
    [user.full_name, user.role, user.username, hash, locationId]
  );
  return r.rows[0].id;
}

async function ensureSparePart(client, sp) {
  const ex = await client.query('SELECT id FROM spare_parts WHERE part_number = $1', [sp.part_number]);
  if (ex.rows[0]) return ex.rows[0].id;
  const r = await client.query(
    `INSERT INTO spare_parts (part_number, name, description, stock_current, stock_min, cost_price, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [sp.part_number, sp.name, sp.description, sp.stock_current, sp.stock_min, sp.cost_price, sp.location]
  );
  return r.rows[0].id;
}

async function seed() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const locGasId = await ensureLocation(client, 'GASOLINERA ESTACION');
    const locPosId = await ensureLocation(client, 'POSTAS DE LA JOYOSA');

    const deptCache = {};
    const assetMap = {};

    async function getDept(locId, deptName) {
      const key = `${locId}::${deptName}`;
      if (!deptCache[key]) deptCache[key] = await ensureDepartment(client, locId, deptName);
      return deptCache[key];
    }

    for (const a of ASSETS_GAS) {
      const dId = await getDept(locGasId, a.dept);
      const aId = await ensureAsset(client, dId, a.name);
      assetMap[a.name] = aId;
    }

    for (const a of ASSETS_POS) {
      const dId = await getDept(locPosId, a.dept);
      const aId = await ensureAsset(client, dId, a.name);
      assetMap[a.name] = aId;
    }

    const userMap = {};
    for (const u of USERS) {
      const uId = await ensureUser(client, u, locGasId);
      userMap[u.full_name] = uId;
    }
    const defaultUserId = userMap['Sergio Aznar'];

    const SURTIDORES_GOA = ['SURTIDOR 1 GOA/SP95','SURTIDOR 2 GOA/SP95','SURTIDOR 3 GOA/SP95',
      'SURTIDOR 4 GOA/SP95','SURTIDOR 5 GOA','SURTIDOR 6 GOA','SURTIDOR 7 GOA','SURTIDOR 8 GOA',
      'SURTIDOR 9 GOA','SURTIDOR 10 GOA','SURTIDOR 11 GOA','SURTIDOR 12 GOA'];
    const SURTIDORES_ADU = ['SURTIDOR 13 AdBLUE','SURTIDOR 14 AdBLUE','SURTIDOR 15 AdBLUE',
      'SURTIDOR 16 AdBLUE','SURTIDOR 17 AdBLUE','SURTIDOR 18 AdBLUE','SURTIDOR 19 AdBLUE'];

    const PLANS = [
      ...SURTIDORES_GOA.flatMap(name => [
        { asset: name, task: 'Revision mangueras y pistolas', freq: 30 },
        { asset: name, task: 'Inspeccion general surtidor', freq: 90 },
      ]),
      ...SURTIDORES_ADU.flatMap(name => [
        { asset: name, task: 'Revision mangueras y pistolas AdBlue', freq: 30 },
        { asset: name, task: 'Limpieza filtros AdBlue', freq: 60 },
      ]),
      ...['BOX 1','BOX 2','BOX 3','BOX 4','BOX 5  LAVADO CAMIONES'].map(name => (
        { asset: name, task: 'Revision instalacion y limpieza box', freq: 30 }
      )),
      { asset: 'ASPIRADOR 1', task: 'Limpieza filtros aspirador', freq: 14 },
      { asset: 'ASPIRADOR 2', task: 'Limpieza filtros aspirador', freq: 14 },
      { asset: 'BARRERA ENTRADA', task: 'Revision y lubricacion barrera', freq: 90 },
      { asset: 'BARRERA SALIDA', task: 'Revision y lubricacion barrera', freq: 90 },
      ...['HORNO 1','HORNO 2','HORNO 3','HORNO 4','HORNO PAN'].map(name => (
        { asset: name, task: 'Limpieza interior horno', freq: 7 }
      )),
      { asset: 'FREIDORA GRANDE', task: 'Cambio de aceite freidora', freq: 7 },
      { asset: 'FREIDORA PEQUEÑA', task: 'Cambio de aceite freidora', freq: 7 },
      { asset: 'CAFETERA 1 (PRINCIPAL)', task: 'Descalcificacion y limpieza cafetera', freq: 30 },
      { asset: 'CAFETERA 2 (SNACK)', task: 'Descalcificacion y limpieza cafetera', freq: 30 },
      { asset: 'CAFETERA CAPSULAS', task: 'Limpieza y descalcificacion', freq: 30 },
      { asset: 'CAMPANA EXTRACCION', task: 'Limpieza filtros campana extractora', freq: 30 },
      { asset: 'TREN LAVADO', task: 'Revision y limpieza tren de lavado', freq: 14 },
      ...['DUCHA 1 (EMPLEADOS/CALDERAS)','DUCHA 2','DUCHA 3','DUCHA 4','DUCHA 5','DUCHA 6','DUCHA 7'].map(name => (
        { asset: name, task: 'Higienizacion duchas (Legionella)', freq: 7 }
      )),
    ];

    for (const p of PLANS) {
      const aId = assetMap[p.asset];
      if (!aId) continue;
      const ex = await client.query(
        'SELECT id FROM maintenance_plans WHERE asset_id = $1 AND task_description = $2',
        [aId, p.task]
      );
      if (!ex.rows[0]) {
        await client.query(
          `INSERT INTO maintenance_plans (asset_id, task_description, frequency_days, start_date, next_due_date)
           VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + $3)`,
          [aId, p.task, p.freq]
        );
      }
    }

    for (const sp of SPARE_PARTS) {
      await ensureSparePart(client, sp);
    }

    for (const av of AVERIAS) {
      const assetId = av.maquina ? (assetMap[av.maquina] || null) : null;
      const userId = userMap[av.operario] || defaultUserId;

      let parsedDate = null;
      if (av.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(av.fecha)) {
        const parts = av.fecha.split('/');
        parsedDate = parts[2] + '-' + parts[1] + '-' + parts[0];
      }

      const comment = av.titulo + (av.desc ? (' — ' + av.desc) : '');
      const solution = av.estado === 'Finalizado' ? 'Averia resuelta.' : null;

      const ex = await client.query(
        'SELECT id FROM intervention_logs WHERE asset_id IS NOT DISTINCT FROM $1 AND global_comment = $2',
        [assetId, comment]
      );
      if (!ex.rows[0]) {
        const r = await client.query(
          `INSERT INTO intervention_logs (asset_id, user_id, created_at, global_comment, solution)
           VALUES ($1, $2, COALESCE($5::timestamp, NOW()), $3, $4) RETURNING id`,
          [assetId, userId, comment, solution, parsedDate]
        );
        await client.query(
          `INSERT INTO intervention_tasks (intervention_id, description, status)
           VALUES ($1, $2, 'DONE')`,
          [r.rows[0].id, av.tipo + ': ' + av.titulo]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seed La Joyosa completado.');
    console.log(`  Assets: ${Object.keys(assetMap).length}`);
    console.log(`  Users: sergio / roberto / raquel  (password: demo2024)`);
    console.log(`  Intervenciones historicas: ${AVERIAS.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed fallido:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed();
