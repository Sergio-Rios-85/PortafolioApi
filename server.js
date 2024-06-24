import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2';
import cors from 'cors';
import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import formidable from 'formidable';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import validator from 'validator'; 

dotenv.config();
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'sergio',
  password: 'sepultura',
  database: 'AUTOMOTORACERTITECH'
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta para registro de clientes
app.post('/registro', (req, res) => {
  const data = req.body;

  if (!validator.isEmail(data.CORREO_CLIENTE)) {
    return res.status(400).json({ message: 'Correo electrónico no válido' });
  }

  connection.query('INSERT INTO CLIENTE SET ?', data, (error, results) => {
    if (error) {
      console.error('Error al insertar en la base de datos:', error.sqlMessage);
      res.status(500).json({ message: 'Error al registrar', error: error.sqlMessage });
    } else {
      console.log('Registro exitoso');
      res.json({ message: 'Registro exitoso' });
    }
  });
});


// Ruta para inicio de sesión de clientes
app.post('/login-cliente', (req, res) => {
  const { correo, contrasena } = req.body;
  connection.query('SELECT * FROM CLIENTE WHERE CORREO_CLIENTE = ? AND CONTRASENA = ?', [correo, contrasena], (error, results) => {
    if (error) {
      console.error('Error al consultar en la base de datos:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      if (results.length > 0) {
        console.log('Inicio de sesión exitoso');
        res.json({ message: 'Inicio de sesión exitoso', clienteId: results[0].ID_CLIENTE });
      } else {
        console.log('Credenciales incorrectas');
        res.status(401).json({ message: 'Credenciales incorrectas' });
      }
    }
  });
});

app.post('/api/reset-password', (req, res) => {
  const { email, password } = req.body;
  connection.query('UPDATE CLIENTE SET CONTRASENA = ? WHERE CORREO_CLIENTE = ?', [password, email], (error, results) => {
    if (error) {
      console.error('Error al actualizar la contraseña:', error);
      res.status(500).json({ message: 'Error al restablecer la contraseña' });
    } else {
      res.json({ message: 'Contraseña restablecida con éxito' });
    }
  });
});


const transporter = nodemailer.createTransport({
  service: 'Outlook365',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


app.post('/contacto', (req, res) => {
  const data = req.body;

  // Validar el correo electrónico en el servidor
  if (!validator.isEmail(data.correo)) {
    return res.status(400).json({ message: 'Correo electrónico no válido' });
  }

  connection.query('INSERT INTO CONTACTO SET ?', data, (error, results) => {
    if (error) {
      console.error('Error al insertar en la base de datos:', error);
      res.status(500).json({ message: 'Error al enviar el contacto' });
    } else {
      console.log('Contacto enviado exitosamente');

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'certitech02@gmail.com',
        subject: 'Nuevo contacto recibido',
        text: `Nombre: ${data.nombre}\nCorreo: ${data.correo}\nMensaje: ${data.mensaje}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error al enviar el correo:', error);
          res.status(500).json({ message: 'Error al enviar el contacto' });
        } else {
          console.log('Correo enviado:', info.response);
          res.json({ message: 'Contacto enviado exitosamente' });
        }
      });
    }
  });
});

// Ruta para inicio de sesión de usuarios
app.post('/login-usuario', (req, res) => {
  const { usuario, contrasena } = req.body;
  connection.query('SELECT * FROM USUARIO WHERE USUARIO = ? AND CONTRASENA = ?', [usuario, contrasena], (error, results) => {
    if (error) {
      console.error('Error al consultar en la base de datos:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    } else {
      if (results.length > 0) {
        console.log('Inicio de sesión exitoso para trabajador');
        res.json({ message: 'Inicio de sesión exitoso', usuarioId: results[0].ID_USUARIO });
      } else {
        console.log('Credenciales incorrectas para trabajador');
        res.status(401).json({ message: 'Credenciales incorrectas' });
      }
    }
  });
});


// Ruta para registro de vehículos
// Endpoint para insertar un vehículo
app.post('/vehiculo', (req, res) => {
  const vehiculo = req.body;
  connection.query('INSERT INTO VEHICULO SET ?', vehiculo, (error, result) => {
    if (error) {
      console.error('Error al insertar en la base de datos:', error);
      res.status(500).json({ message: 'Error al registrar' });
    } else {
      const vehiculoId = result.insertId; // Obtenemos el ID del vehículo insertado
      // Consultamos los datos del vehículo recién insertado
      connection.query('SELECT * FROM VEHICULO WHERE ID_VEHICULO = ?', [vehiculoId], (error, results) => {
        if (error) {
          console.error('Error al obtener datos del vehículo:', error);
          res.status(500).json({ message: 'Error al obtener datos del vehículo' });
        } else {
          if (results.length > 0) {
            const nuevoVehiculo = results[0];
            res.json({ message: 'Registro exitoso', vehiculo: nuevoVehiculo });
          } else {
            res.status(404).json({ message: 'Vehículo no encontrado después de insertar' });
          }
        }
      });
    }
  });
});

// Endpoint para obtener todas las marcas
app.get('/marcas', (req, res) => {
  connection.query('SELECT * FROM MARCA', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

// Endpoint para obtener los modelos filtrados por marca
app.get('/modelos', (req, res) => {
  const idMarca = req.query.idMarca;
  if (idMarca) {
    connection.query('SELECT * FROM MODELO WHERE ID_MARCA = ?', [idMarca], (error, results) => {
      if (error) {
        console.error('Error al obtener datos de la base de datos:', error);
        res.status(500).json({ message: 'Error al obtener datos' });
      } else {
        res.json(results);
      }
    });
  } else {
    connection.query('SELECT * FROM MODELO', (error, results) => {
      if (error) {
        console.error('Error al obtener datos de la base de datos:', error);
        res.status(500).json({ message: 'Error al obtener datos' });
      } else {
        res.json(results);
      }
    });
  }
});

// Endpoint para obtener todos los colores
app.get('/colores', (req, res) => {
  connection.query('SELECT * FROM COLOR', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

// Endpoint para obtener todos los años
app.get('/anios', (req, res) => {
  connection.query('SELECT * FROM ANIO', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});


app.post('/buscar-vehiculos', (req, res) => {
  const { PATENTE, MOTOR, CHASIS } = req.body;
  let query = `
    SELECT V.PATENTE, V.MOTOR, 
           V.CHASIS, V.KILOMETRAJE, 
           M.MARCA AS VEH_MARCA, 
           MO.MODELO AS VEH_MODELO, 
           C.COLOR AS VEH_COLOR, 
           A.ANIO AS VEH_ANIO
    FROM VEHICULO V
    JOIN MARCA M ON V.VEH_MARCA = M.ID_MARCA
    JOIN MODELO MO ON V.VEH_MODELO = MO.ID_MODELO
    JOIN COLOR C ON V.VEH_COLOR = C.ID_COLOR
    JOIN ANIO A ON V.VEH_ANIO = A.ID_ANIO
    WHERE 1=1
  `;
  const params = [];

  if (PATENTE) {
    query += ' AND V.PATENTE = ?';
    params.push(PATENTE);
  }
  if (MOTOR) {
    query += ' AND V.MOTOR = ?';
    params.push(MOTOR);
  }
  if (CHASIS) {
    query += ' AND V.CHASIS = ?';
    params.push(CHASIS);
  }

  connection.query(query, params, (error, results) => {
    if (error) {
      console.error('Error al buscar vehículos:', error);
      res.status(500).json({ message: 'Error al buscar vehículos' });
    } else {
      res.json(results);
    }
  });
});


app.post('/oi', (req, res) => {
  console.log('Datos recibidos:', req.body); // Verifica qué datos se están recibiendo
  const inspeccion = {
    FECHA: req.body.FECHA,
    HORA: req.body.HORA,
    INSP_PATENTE: req.body.INSP_PATENTE,
    INSP_TRANSMISION: req.body.INSP_TRANSMISION,
    INSP_COMBUSTIBLE: req.body.INSP_COMBUSTIBLE,
    INSP_RESULTADO_INSPECCION: req.body.INSP_RESULTADO_INSPECCION,
    INSP_PIEZA_ROTA: req.body.INSP_PIEZA_ROTA,
    INSP_TIPO_DANIO: req.body.INSP_TIPO_DANIO,
    INSP_GRAVEDAD_DANIO: req.body.INSP_GRAVEDAD_DANIO,
    OBSERVACION: req.body.OBSERVACION
  };

  connection.query('INSERT INTO INSPECCION SET ?', inspeccion, (error, result) => {
    if (error) {
      console.error('Error al insertar en la base de datos:', error);
      res.status(500).json({ message: 'Error al registrar la inspección', error });
    } else {
      res.json({ message: 'Inspección registrada con éxito' });
    }
  });
});

app.get('/patentes', (req, res) => {
  connection.query('SELECT * FROM VEHICULO', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/transmisions', (req, res) => {
  connection.query('SELECT * FROM TRANSMISION', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/combustibles', (req, res) => {
  connection.query('SELECT * FROM COMBUSTIBLE', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/resultados', (req, res) => {
  connection.query('SELECT * FROM RESULTADO_INSPECCION', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/pieza_rotas', (req, res) => {
  connection.query('SELECT * FROM PIEZA_ROTA', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/tipo_danios', (req, res) => {
  connection.query('SELECT * FROM TIPO_DANIO', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/gravedad_danios', (req, res) => {
  connection.query('SELECT * FROM GRAVEDAD_DANIO', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

// Endpoint para obtener todas las inspecciones con uniones
app.get('/inspecciones', (req, res) => {
  const query = `
    SELECT 
      i.ID_OI, 
      i.FECHA, 
      i.HORA, 
      v.PATENTE AS INSP_PATENTE, 
      t.TRANSMISION AS INSP_TRANSMISION, 
      c.COMBUSTIBLE AS INSP_COMBUSTIBLE, 
      r.RESULTADO_INSPECCION AS INSP_RESULTADO_INSPECCION, 
      p.PIEZA_ROTA AS INSP_PIEZA_ROTA, 
      td.TIPO_DANIO AS INSP_TIPO_DANIO, 
      g.GRAVEDAD_DANIO AS INSP_GRAVEDAD_DANIO,
      i.OBSERVACION,
      v.MOTOR AS VEH_MOTOR,
      v.CHASIS AS VEH_CHASIS,
      v.KILOMETRAJE AS VEH_KILOMETRAJE,
      m.MARCA AS VEH_MARCA,
      mo.MODELO AS VEH_MODELO,
      co.COLOR AS VEH_COLOR,
      a.ANIO AS VEH_ANIO
    FROM INSPECCION i
    JOIN VEHICULO v ON i.INSP_PATENTE = v.ID_VEHICULO
    JOIN TRANSMISION t ON i.INSP_TRANSMISION = t.ID_TRANSMISION
    JOIN COMBUSTIBLE c ON i.INSP_COMBUSTIBLE = c.ID_COMBUSTIBLE
    JOIN RESULTADO_INSPECCION r ON i.INSP_RESULTADO_INSPECCION = r.ID_RESULTADO_INSPECCION
    LEFT JOIN PIEZA_ROTA p ON i.INSP_PIEZA_ROTA = p.ID_PIEZA_ROTA
    LEFT JOIN TIPO_DANIO td ON i.INSP_TIPO_DANIO = td.ID_TIPO_DANIO
    LEFT JOIN GRAVEDAD_DANIO g ON i.INSP_GRAVEDAD_DANIO = g.ID_GRAVEDAD_DANIO
    JOIN MARCA m ON v.VEH_MARCA = m.ID_MARCA
    JOIN MODELO mo ON v.VEH_MODELO = mo.ID_MODELO
    JOIN COLOR co ON v.VEH_COLOR = co.ID_COLOR
    JOIN ANIO a ON v.VEH_ANIO = a.ID_ANIO
  `;

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error al obtener inspecciones:', error);
      res.status(500).json({ message: 'Error al obtener inspecciones' });
    } else {
      res.json(results);
    }
  });
});

app.post('/generate-pdf', (req, res) => {
  const form = formidable({ multiples: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(500).json({ message: 'Error al procesar el formulario' });
      return;
    }

    console.log('Campos recibidos:', fields);
    console.log('Archivos recibidos:', files);

    // Extraer y analizar los datos de inspección correctamente
    const inspeccion = JSON.parse(fields.inspeccion[0]); 
    const fechaFormateada = inspeccion.FECHA.split('T')[0];
    const horaFormateada = inspeccion.HORA.replace(/:/g, '-');
    const filename = `Inspeccion_${fechaFormateada}_${horaFormateada}.pdf`;

    const folderPath = path.join(__dirname, 'pdfs');
    const filePath = path.join(folderPath, filename);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Verifica y lee la imagen correctamente
    let imageBuffer = null;
    const imageFile = files.image ? files.image[0] : null;  // Acceder al primer elemento del array

    if (imageFile && imageFile.filepath) {
      try {
        console.log('Leyendo archivo de imagen desde:', imageFile.filepath);
        imageBuffer = fs.readFileSync(imageFile.filepath);
        console.log('Archivo de imagen leído correctamente');
      } catch (err) {
        console.error('Error al leer el archivo de imagen:', err);
      }
    } else {
      console.log('No se proporcionó ninguna imagen');
    }

    let imageDataUrl = null;
    if (imageBuffer) {
      imageDataUrl = 'data:image/jpeg;base64,' + imageBuffer.toString('base64');
      console.log('Imagen convertida a base64');
    }

    const docDefinition = {
      content: [
        { text: 'INFORME INSPECCIÓN', style: 'header' },
        {
          columns: [
            [
              { text: `OI N° ${inspeccion.ID_OI}`, style: 'subheader' },
              { text: `Resultado inspección: ${inspeccion.INSP_RESULTADO_INSPECCION}`, style: 'subheader' },
              { text: `Fecha: ${fechaFormateada}`, style: 'subheader' },
              { text: `Hora: ${inspeccion.HORA}`, style: 'subheader' },
              { text: `Patente: ${inspeccion.INSP_PATENTE}`, style: 'subheader' }
            ],
            imageDataUrl ? { image: imageDataUrl, width: 200, height: 200, alignment: 'right', margin: [0, 0, 0, 0] } : {}
          ]
        },
        { text: 'REPORTE DE PREEXISTENCIAS / DAÑOS', style: 'subheader', margin: [0, 20, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*'],
            body: [
              ['Campo', 'Valor'],
              ['Transmisión:', inspeccion.INSP_TRANSMISION],
              ['Combustible:', inspeccion.INSP_COMBUSTIBLE],
              ['Pieza Dañada:', inspeccion.INSP_PIEZA_ROTA],
              ['Tipo de Daño:', inspeccion.INSP_TIPO_DANIO],
              ['Gravedad del Daño:', inspeccion.INSP_GRAVEDAD_DANIO],
              ['Observación:', inspeccion.OBSERVACION]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: 'DATOS DEL VEHÍCULO', style: 'subheader', margin: [0, 20, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*'],
            body: [
              ['Campo', 'Valor'],
              ['Marca:', inspeccion.VEH_MARCA],
              ['Modelo:', inspeccion.VEH_MODELO],
              ['Color:', inspeccion.VEH_COLOR],
              ['Año:', inspeccion.VEH_ANIO],
              ['Motor:', inspeccion.VEH_MOTOR],
              ['Chasis:', inspeccion.VEH_CHASIS],
              ['Kilometraje:', inspeccion.VEH_KILOMETRAJE],
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        tableExample: {
          margin: [0, 5, 0, 15]
        }
      }
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer) => {
      fs.writeFileSync(filePath, buffer);
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error al enviar el archivo', err);
          res.status(500).json({ message: 'Error al enviar el archivo' });
        } else {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error al eliminar el archivo', err);
          });
        }
      });
    });
  });
});





// Ruta para obtener regiones
app.get('/regiones', (req, res) => {
  connection.query('SELECT * FROM REGION', (error, results) => {
    if (error) {
      console.error('Error al obtener regiones:', error);
      res.status(500).json({ message: 'Error al obtener regiones' });
    } else {
      res.json(results);
    }
  });
});

// Ruta para obtener sucursales por región
app.get('/sucursales/:regionId', (req, res) => {
  const { regionId } = req.params;
  console.log(`Recibida solicitud para obtener sucursales de la región con ID: ${regionId}`);

  const query = 'SELECT * FROM SUCURSAL WHERE SUC_REGION = ?';
  connection.query(query, [regionId], (error, results) => {
    if (error) {
      console.error('Error al obtener sucursales:', error);
      res.status(500).json({ message: 'Error al obtener sucursales' });
    } else {
      console.log(`Sucursales obtenidas: ${JSON.stringify(results)}`);
      res.json(results);
    }
  });
});

app.get('/available-times', (req, res) => {
  const { date } = req.query;
  console.log(`Fecha recibida para obtener horarios: ${date}`);
  const query = `
    SELECT h.ID_HORARIO, h.FECHA, ho.HORA, h.BOOKED 
    FROM HORARIOS h 
    JOIN HORA ho ON h.DISPONIBLE_HORA = ho.ID_HORA 
    WHERE h.FECHA = ?
  `;
  connection.query(query, [date], (error, results) => {
    if (error) {
      console.error('Error al obtener horarios:', error);
      res.status(500).json({ message: 'Error al obtener horarios' });
    } else {
      console.log('Horarios obtenidos:', results);
      res.json(results);
    }
  });
});






// Ruta para agregar horarios disponibles
app.post('/add-horarios', (req, res) => {
  const { date } = req.body;

  // Definir las horas disponibles como enteros que corresponden a los IDs en la tabla HORA
  const horasDisponibles = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  ];

  const values = horasDisponibles.map(horaId => [date, horaId, false]);

  const query = 'INSERT INTO HORARIOS (FECHA, DISPONIBLE_HORA, BOOKED) VALUES ?';
  connection.query(query, [values], (error, results) => {
    if (error) {
      console.error('Error al agregar horarios:', error);
      res.status(500).json({ message: 'Error al agregar horarios' });
    } else {
      res.json({ message: 'Horarios agregados correctamente' });
    }
  });
});



// Ruta para reservar
app.post('/reservar', (req, res) => {
  const { FECHA, SUCURSAL, HORA, RE_PATENTE, RE_MARCA, RE_MODELO, RE_ANIO } = req.body;
  const query = 'INSERT INTO RESERVAS (RE_FECHA, RE_SUCURSAL, RE_HORA, RE_PATENTE, RE_MARCA, RE_MODELO, RE_ANIO) VALUES (?, ?, ?, ?, ?, ?, ?)';
  connection.query(query, [FECHA, SUCURSAL, HORA, RE_PATENTE, RE_MARCA, RE_MODELO, RE_ANIO], (error, results) => {
    if (error) {
      console.error('Error al insertar en la base de datos:', error);
      res.status(500).json({ message: 'Error al reservar' });
    } else {
      res.json({ message: 'Reserva exitosa' });
    }
  });
});



// Rutas adicionales para cargar datos de vehículo
app.get('/vehiculo/:patente', (req, res) => {
  const { patente } = req.params;
  const query = `
    SELECT 
      V.PATENTE, M.MARCA, MO.MODELO, A.ANIO
    FROM VEHICULO V
    JOIN MARCA M ON V.VEH_MARCA = M.ID_MARCA
    JOIN MODELO MO ON V.VEH_MODELO = MO.ID_MODELO
    JOIN ANIO A ON V.VEH_ANIO = A.ID_ANIO
    WHERE V.PATENTE = ?
  `;
  connection.query(query, [patente], (error, results) => {
    if (error) {
      console.error('Error al obtener datos del vehículo:', error);
      res.status(500).json({ message: 'Error al obtener datos del vehículo' });
    } else {
      res.json(results[0]);
    }
  });
});



app.get('/marcas', (req, res) => {
  connection.query('SELECT * FROM MARCA', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/modelos', (req, res) => {
  connection.query('SELECT * FROM MODELO', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

app.get('/anios', (req, res) => {
  connection.query('SELECT * FROM ANIO', (error, results) => {
    if (error) {
      console.error('Error al obtener datos de la base de datos:', error);
      res.status(500).json({ message: 'Error al obtener datos' });
    } else {
      res.json(results);
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
