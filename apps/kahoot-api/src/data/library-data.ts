import { createHash } from "node:crypto";

/** Dueño de los cuestionarios de la biblioteca compartida (no es una cuenta que pueda iniciar sesión). */
export const LIBRARY_OWNER_ID = "00000000-0000-4000-8000-0000000000a0";

/** UUID v4 estable derivado de una clave, para que la biblioteca sea idempotente. */
export function stableUuid(key: string): string {
  const h = createHash("sha1").update(`rubymind:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export interface LibraryQuestion {
  statement: string;
  options: string[];
  correctOption: number;
}
export interface LibraryQuiz {
  slug: string;
  title: string;
  description: string;
  category: "Cultura general" | "Tecnología";
  questions: LibraryQuestion[];
}

const q = (
  statement: string,
  options: string[],
  correctOption: number,
): LibraryQuestion => ({ statement, options, correctOption });
const tf = (statement: string, truth: boolean): LibraryQuestion =>
  q(statement, ["Verdadero", "Falso"], truth ? 0 : 1);

export const LIBRARY: LibraryQuiz[] = [
  {
    slug: "geografia-del-mundo",
    title: "Geografía del mundo",
    description: "Países, capitales, ríos y océanos.",
    category: "Cultura general",
    questions: [
      q("¿Cuál es el río más largo de Sudamérica?", ["Amazonas", "Orinoco", "Paraná", "Magdalena"], 0),
      q("¿Cuál es la capital de Australia?", ["Sídney", "Melbourne", "Canberra", "Perth"], 2),
      q("¿En qué continente está el desierto del Sahara?", ["Asia", "África", "Australia", "América"], 1),
      q("¿Cuál es el país más grande del mundo por superficie?", ["Canadá", "China", "Estados Unidos", "Rusia"], 3),
      q("¿Cuál es el océano más grande del planeta?", ["Atlántico", "Índico", "Pacífico", "Ártico"], 2),
      q("¿Cuál es la capital de Costa Rica?", ["Alajuela", "San José", "Cartago", "Heredia"], 1),
      tf("El monte Everest es la montaña más alta del mundo sobre el nivel del mar.", true),
      q("¿Qué país tiene forma de bota?", ["Grecia", "España", "Italia", "Portugal"], 2),
      q("¿Qué línea imaginaria divide la Tierra en hemisferio norte y sur?", ["Meridiano de Greenwich", "Ecuador", "Trópico de Cáncer", "Círculo polar ártico"], 1),
      q("¿Cuál es el lago más grande de Centroamérica?", ["Lago de Nicaragua", "Lago Arenal", "Lago de Atitlán", "Lago de Managua"], 0),
    ],
  },
  {
    slug: "historia-universal",
    title: "Historia universal",
    description: "Hechos y personajes que marcaron la historia.",
    category: "Cultura general",
    questions: [
      q("¿En qué año llegó Cristóbal Colón a América?", ["1453", "1492", "1521", "1607"], 1),
      q("¿Qué civilización construyó Machu Picchu?", ["Maya", "Azteca", "Inca", "Olmeca"], 2),
      q("¿En qué año cayó el Muro de Berlín?", ["1979", "1985", "1989", "1991"], 2),
      q("¿Quién fue el primer presidente de Estados Unidos?", ["Abraham Lincoln", "George Washington", "Thomas Jefferson", "John Adams"], 1),
      tf("La Revolución Francesa comenzó en 1789.", true),
      q("¿Qué civilización gobernó Julio César?", ["Egipcia", "Persa", "Romana", "Otomana"], 2),
      q("¿Qué conflicto mundial comenzó en 1939?", ["Primera Guerra Mundial", "Segunda Guerra Mundial", "Guerra Fría", "Revolución Rusa"], 1),
      q("¿En qué año se independizó Costa Rica de España?", ["1810", "1821", "1848", "1856"], 1),
      q("¿Quién lideró la independencia de la India mediante la no violencia?", ["Nehru", "Mahatma Gandhi", "Subhas Bose", "Patel"], 1),
      q("¿Qué civilización antigua inventó la escritura cuneiforme?", ["Egipcia", "Sumeria", "Griega", "China"], 1),
    ],
  },
  {
    slug: "ciencia-y-naturaleza",
    title: "Ciencia y naturaleza",
    description: "Física, química, biología y astronomía básicas.",
    category: "Cultura general",
    questions: [
      q("¿Cuál es el planeta más cercano al Sol?", ["Venus", "Mercurio", "Marte", "Tierra"], 1),
      q("¿Qué gas absorben las plantas para la fotosíntesis?", ["Oxígeno", "Nitrógeno", "Dióxido de carbono", "Hidrógeno"], 2),
      q("¿Cuántos huesos tiene el cuerpo de un adulto?", ["186", "206", "226", "256"], 1),
      tf("El agua hierve a 100 °C al nivel del mar.", true),
      q("¿Cuál es el símbolo químico del oro?", ["Ag", "Au", "Go", "Or"], 1),
      q("¿Qué órgano bombea la sangre por el cuerpo?", ["Hígado", "Pulmón", "Corazón", "Riñón"], 2),
      q("¿Cuál es la unidad de fuerza en el Sistema Internacional?", ["Joule", "Newton", "Watt", "Pascal"], 1),
      q("¿Cuál es el animal terrestre más grande?", ["Rinoceronte", "Elefante africano", "Jirafa", "Hipopótamo"], 1),
      tf("La luz viaja más rápido que el sonido.", true),
      q("¿Quién formuló la teoría de la relatividad?", ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Galileo Galilei"], 2),
    ],
  },
  {
    slug: "arte-literatura-y-cine",
    title: "Arte, literatura y cine",
    description: "Obras, autores y artistas conocidos.",
    category: "Cultura general",
    questions: [
      q("¿Quién pintó La Mona Lisa?", ["Miguel Ángel", "Leonardo da Vinci", "Rafael", "Botticelli"], 1),
      q("¿Quién escribió Don Quijote de la Mancha?", ["Lope de Vega", "Miguel de Cervantes", "Quevedo", "García Lorca"], 1),
      q("¿Quién escribió Cien años de soledad?", ["Mario Vargas Llosa", "Julio Cortázar", "Gabriel García Márquez", "Pablo Neruda"], 2),
      q("¿Qué pintor realizó La noche estrellada?", ["Claude Monet", "Vincent van Gogh", "Pablo Picasso", "Salvador Dalí"], 1),
      tf("Beethoven compuso la Novena Sinfonía.", true),
      q("¿De qué país es originario el flamenco?", ["Portugal", "Italia", "España", "México"], 2),
      q("¿Quién dirigió la película Titanic (1997)?", ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Ridley Scott"], 1),
      q("¿Cuántas cuerdas tiene una guitarra estándar?", ["4", "5", "6", "7"], 2),
      q("¿Qué autor creó al detective Sherlock Holmes?", ["Agatha Christie", "Arthur Conan Doyle", "Edgar Allan Poe", "Charles Dickens"], 1),
      q("¿En qué museo se encuentra La Mona Lisa?", ["Museo del Prado", "Museo del Louvre", "Galería Uffizi", "Museo Británico"], 1),
    ],
  },
  {
    slug: "deportes-y-curiosidades",
    title: "Deportes y curiosidades",
    description: "Deportes, récords y datos curiosos.",
    category: "Cultura general",
    questions: [
      q("¿Cada cuántos años se celebra el Mundial de fútbol masculino?", ["2", "3", "4", "5"], 2),
      q("¿Cuántos jugadores de cada equipo hay en el campo en un partido de fútbol?", ["9", "10", "11", "12"], 2),
      q("¿En qué deporte se disputan games y sets?", ["Tenis", "Natación", "Golf", "Boxeo"], 0),
      q("¿Qué selección ganó el Mundial de fútbol de 2022?", ["Francia", "Argentina", "Brasil", "Croacia"], 1),
      tf("Los Juegos Olímpicos modernos se celebraron por primera vez en Atenas en 1896.", true),
      q("¿Cuántos anillos tiene la bandera olímpica?", ["4", "5", "6", "7"], 1),
      q("¿Cuál es el animal terrestre más rápido?", ["León", "Guepardo", "Antílope", "Caballo"], 1),
      q("¿Cuántos minutos dura un partido de fútbol sin tiempo extra?", ["60", "80", "90", "100"], 2),
      q("¿Cuál es el único mamífero capaz de volar?", ["Ardilla voladora", "Murciélago", "Colibrí", "Lémur"], 1),
      q("¿Cuántas casillas tiene un tablero de ajedrez?", ["32", "48", "64", "81"], 2),
    ],
  },
  {
    slug: "fundamentos-de-programacion",
    title: "Fundamentos de programación",
    description: "Conceptos básicos para quien empieza a programar.",
    category: "Tecnología",
    questions: [
      q("¿Qué estructura de control repite un bloque de código?", ["Condicional", "Bucle", "Función", "Comentario"], 1),
      q("¿Qué tipo de dato representa verdadero o falso?", ["String", "Integer", "Boolean", "Float"], 2),
      tf("En la mayoría de los lenguajes, el primer índice de un arreglo es 0.", true),
      q("¿Qué significan las siglas HTML?", ["HyperText Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Link", "Home Tool Markup Language"], 0),
      q("¿Qué estructura de datos sigue el principio LIFO (último en entrar, primero en salir)?", ["Cola", "Pila", "Árbol", "Grafo"], 1),
      q("¿Qué lenguaje se ejecuta principalmente en el navegador?", ["C++", "Java", "JavaScript", "COBOL"], 2),
      q("¿Qué es un algoritmo?", ["Un lenguaje de programación", "Una secuencia finita de pasos para resolver un problema", "Un tipo de hardware", "Un error de código"], 1),
      q("¿Qué paradigma organiza el código en objetos con atributos y métodos?", ["Funcional", "Orientado a objetos", "Lógico", "Declarativo"], 1),
      q("¿Qué comando de Git envía tus commits al repositorio remoto?", ["git pull", "git push", "git clone", "git merge"], 1),
      q("¿Qué complejidad tiene la búsqueda binaria en un arreglo ordenado?", ["O(n)", "O(log n)", "O(n²)", "O(1)"], 1),
    ],
  },
  {
    slug: "internet-y-redes",
    title: "Internet y redes",
    description: "Cómo funciona la web y las redes de computadoras.",
    category: "Tecnología",
    questions: [
      q("¿Qué significan las siglas WWW?", ["World Wide Web", "Wide Web World", "Web World Window", "World Web Wire"], 0),
      q("¿Qué protocolo se usa para navegar por páginas web de forma segura?", ["HTTP", "FTP", "HTTPS", "SMTP"], 2),
      q("¿Qué dispositivo conecta una red local con Internet?", ["Switch", "Router", "Hub", "Repetidor"], 1),
      tf("Una dirección IPv4 está formada por cuatro números separados por puntos.", true),
      q("¿Qué servicio traduce nombres de dominio a direcciones IP?", ["DHCP", "DNS", "FTP", "SSH"], 1),
      q("¿Qué puerto usa HTTPS por defecto?", ["21", "80", "443", "8080"], 2),
      q("¿Qué protocolo se usa para enviar correo electrónico?", ["SMTP", "SSH", "DNS", "NTP"], 0),
      q("¿Qué significan las siglas URL?", ["Uniform Resource Locator", "Universal Reference Link", "Unified Remote Language", "User Resource Line"], 0),
      q("¿Qué tecnología permite conectarse de forma inalámbrica a una red local?", ["Ethernet", "Wi-Fi", "Fibra óptica", "USB"], 1),
      q("¿Qué protocolo permite administrar servidores de forma remota y cifrada?", ["Telnet", "SSH", "FTP", "HTTP"], 1),
    ],
  },
  {
    slug: "hardware-y-sistemas-operativos",
    title: "Hardware y sistemas operativos",
    description: "Componentes del computador y sistemas operativos.",
    category: "Tecnología",
    questions: [
      q("¿Qué componente se considera el cerebro del computador?", ["RAM", "CPU", "Disco duro", "Fuente de poder"], 1),
      q("¿Cuál de estas memorias es volátil?", ["SSD", "RAM", "Disco duro", "ROM"], 1),
      q("¿Qué significan las siglas GPU?", ["General Processing Unit", "Graphics Processing Unit", "Global Power Unit", "Group Process Utility"], 1),
      q("¿Cuál de estos es un sistema operativo de código abierto?", ["Windows", "macOS", "Linux", "iOS"], 2),
      tf("Un disco SSD no tiene partes móviles.", true),
      q("¿Cuántos bits tiene un byte?", ["4", "8", "16", "32"], 1),
      q("¿Qué es el kernel de un sistema operativo?", ["La interfaz gráfica", "El núcleo que gestiona los recursos del sistema", "Un antivirus", "Un navegador"], 1),
      q("¿En qué unidad se mide la frecuencia de un procesador?", ["Hertz", "Voltio", "Newton", "Pascal"], 0),
      q("¿Para qué sirve el firmware UEFI o BIOS?", ["Para iniciar el hardware al encender el equipo", "Para navegar en Internet", "Para almacenar fotos", "Para editar texto"], 0),
      q("¿Qué dispositivo permite ver la imagen que genera el computador?", ["Monitor", "Teclado", "Ratón", "Escáner"], 0),
    ],
  },
  {
    slug: "historia-de-la-computacion",
    title: "Historia de la computación",
    description: "Pioneros, máquinas y lenguajes que hicieron la informática.",
    category: "Tecnología",
    questions: [
      q("¿Quién es considerada la primera programadora de la historia?", ["Grace Hopper", "Ada Lovelace", "Margaret Hamilton", "Hedy Lamarr"], 1),
      q("¿Quién propuso la máquina teórica que formalizó el concepto de algoritmo?", ["Alan Turing", "Bill Gates", "Linus Torvalds", "Tim Berners-Lee"], 0),
      q("¿Quién inventó la World Wide Web?", ["Vint Cerf", "Tim Berners-Lee", "Steve Jobs", "Mark Zuckerberg"], 1),
      q("¿Quién creó el kernel Linux?", ["Linus Torvalds", "Richard Stallman", "Dennis Ritchie", "Ken Thompson"], 0),
      tf("ENIAC fue una de las primeras computadoras electrónicas de propósito general.", true),
      q("¿Qué empresa presentó el primer iPhone en 2007?", ["Samsung", "Apple", "Nokia", "Google"], 1),
      q("¿Qué lenguaje de programación creó Dennis Ritchie?", ["Python", "C", "Java", "Pascal"], 1),
      q("¿En qué década apareció ARPANET, el antecedente de Internet?", ["1950", "1960", "1980", "1990"], 1),
      q("¿Quién creó el lenguaje Python?", ["Guido van Rossum", "James Gosling", "Bjarne Stroustrup", "Brendan Eich"], 0),
      q("¿Cómo se llamó el sistema que venció al campeón de ajedrez Kaspárov en 1997?", ["Watson", "Deep Blue", "AlphaGo", "Siri"], 1),
    ],
  },
  {
    slug: "seguridad-ia-y-datos",
    title: "Seguridad, IA y datos",
    description: "Ciberseguridad, inteligencia artificial y bases de datos.",
    category: "Tecnología",
    questions: [
      q("¿Qué es el phishing?", ["Un virus que borra archivos", "Un engaño para robar datos haciéndose pasar por una entidad confiable", "Un tipo de firewall", "Un protocolo de red"], 1),
      q("¿Qué significan las siglas IA?", ["Inteligencia Artificial", "Interfaz Avanzada", "Internet Abierto", "Información Automática"], 0),
      tf("Usar la misma contraseña en todos los sitios es una buena práctica de seguridad.", false),
      q("¿Qué es la autenticación de dos factores (2FA)?", ["Usar dos contraseñas iguales", "Verificar la identidad con dos métodos distintos", "Tener dos cuentas", "Cifrar dos veces"], 1),
      q("¿Qué lenguaje se usa para consultar bases de datos relacionales?", ["SQL", "HTML", "CSS", "Bash"], 0),
      q("¿Qué técnica de inteligencia artificial se inspira en las neuronas del cerebro?", ["Redes neuronales", "Compiladores", "Expresiones regulares", "Hojas de cálculo"], 0),
      q("¿Qué hace un firewall?", ["Acelera la conexión", "Filtra el tráfico de red según reglas de seguridad", "Comprime archivos", "Borra la caché"], 1),
      q("¿Qué es un bug en el software?", ["Un error en el programa", "Un tipo de procesador", "Una red", "Un antivirus"], 0),
      q("¿Qué es una copia de seguridad (backup)?", ["Una copia de los datos para recuperarlos si se pierden", "Una actualización del sistema", "Una contraseña", "Un virus"], 0),
      q("¿Qué protege HTTPS?", ["Cifra la comunicación entre el navegador y el servidor", "Elimina los anuncios", "Acelera las descargas", "Bloquea el spam"], 0),
    ],
  },
];
