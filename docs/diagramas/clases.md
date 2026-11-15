# Diagramas de clases

Los nombres de campos coinciden con el modelo de datos (`docs/modelo-datos.md`). Las clases de dominio no dependen de HTTP, Socket.IO ni del ORM; los repositorios se declaran como puertos (interfaces) y se implementan en la capa de acceso a datos.

## 1. Dominio de kahoot-api

```mermaid
classDiagram
    direction LR

    class Quiz {
        +UUID id
        +UUID ownerId
        +string title
        +string description
        +Date createdAt
        +Date updatedAt
        +addQuestion(q) Question
        +removeQuestion(id) void
        +reorder(ids) void
        +isOwnedBy(userId) bool
    }

    class Question {
        +UUID id
        +UUID quizId
        +string statement
        +bool correctAnswer
        +string imageFilename
        +int position
        +Date createdAt
        +Date updatedAt
    }

    class Session {
        +UUID id
        +string code
        +UUID quizId
        +UUID hostId
        +SessionStatus status
        +int questionTimeSeconds
        +int currentQuestionIndex
        +Date questionClosesAt
        +Date createdAt
        +Date startedAt
        +Date finishedAt
        +isHost(userId) bool
        +currentQuestion() SessionQuestion
    }

    class SessionQuestion {
        +UUID sessionId
        +int position
        +string statement
        +bool correctAnswer
        +string imageFilename
    }

    class Participant {
        +UUID id
        +UUID sessionId
        +UUID userId
        +string displayName
        +int score
        +Date joinedAt
        +addPoints(points) void
    }

    class Answer {
        +UUID id
        +UUID sessionId
        +UUID participantId
        +int questionIndex
        +bool answer
        +Date receivedAt
        +bool isCorrect
        +int points
    }

    class SessionResult {
        +UUID sessionId
        +UUID participantId
        +int position
        +int score
        +int correctAnswers
    }

    class SessionStatus {
        <<enumeration>>
        waiting
        in_progress
        finished
    }

    class GamePhase {
        <<enumeration>>
        waiting
        question_open
        question_closed
        finished
    }

    class GameStateMachine {
        +GamePhase phase
        +start(now) Transition
        +openQuestion(index, now, seconds) Transition
        +closeQuestion(now) Transition
        +finish(now) Transition
        +canAccept(now) bool
        -assertTransition(to) void
    }

    class ScoreCalculator {
        +score(answer, correctAnswer) int
        +rank(participants) SessionResult[]
    }

    class AnswerPolicy {
        +validate(answer, session, participant, now) void
    }

    class SessionCodeGenerator {
        +generate() string
    }

    class Clock {
        <<interface>>
        +now() Date
    }

    class DomainError {
        <<exception>>
        InvalidTransition
        QuestionClosed
        AlreadyAnswered
        NotHost
    }

    Quiz "1" *-- "0..*" Question : contiene
    Quiz "1" --> "0..*" Session : se juega en
    Session "1" *-- "1..*" SessionQuestion : snapshot de preguntas
    Question ..> SessionQuestion : se copia al crear la sala
    Session "1" *-- "0..*" Participant : reúne
    Participant "1" --> "0..*" Answer : responde
    Session "1" --> "0..*" Answer : registra
    Session "1" --> "0..*" SessionResult : clasificación final
    Participant "1" --> "0..1" SessionResult
    Session --> SessionStatus
    GameStateMachine --> GamePhase
    GameStateMachine ..> Session : transiciona
    GameStateMachine ..> Clock
    AnswerPolicy ..> Clock
    AnswerPolicy ..> DomainError
    GameStateMachine ..> DomainError
    ScoreCalculator ..> Answer
    ScoreCalculator ..> SessionQuestion
    ScoreCalculator ..> SessionResult
```

Reglas clave del dominio:
- `GameStateMachine`: `waiting → question_open → question_closed → question_open ... → finished`. Una transición inválida lanza `DomainError.InvalidTransition`. `question_closes_at` lo fija el servidor al abrir la pregunta.
- `AnswerPolicy.validate`: rechaza si la fase no es `question_open`, si `now > questionClosesAt` (reloj del servidor) o si el participante ya respondió (además de la restricción única en base).
- `ScoreCalculator`: 1 punto por respuesta correcta, 0 por incorrecta o ausente; `rank` ordena por puntaje y produce `SessionResult` con los empates compartiendo lugar.

## 2. Servicios y repositorios por capa en kahoot-api

```mermaid
classDiagram
    direction TB

    namespace Presentacion {
        class QuizzesController {
            +create() +list() +get() +update() +remove()
            +addQuestion() +updateQuestion() +removeQuestion()
            +uploadImage()
        }
        class SessionsController {
            +create() +get() +results()
            +join() +start()
        }
        class GameGateway {
            +handleConnection(socket)
            +onJoin() +onStartGame()
            +onNextQuestion() +onCloseQuestion()
            +onSubmitAnswer() +onEndGame()
            +broadcast(event)
        }
        class JwtAuthGuard
        class WsAuthGuard
    }

    namespace Aplicacion {
        class QuizService {
            +createQuiz() +listMine() +updateQuiz()
            +deleteQuiz() +manageQuestions()
            -assertOwner(quiz, userId)
        }
        class SessionService {
            +createSession(quizId, hostId, seconds)
            +joinSession(code, user)
            +getResults(sessionId)
            -snapshotQuestions(quiz)
        }
        class GameService {
            +start() +openNext() +closeQuestion()
            +submitAnswer(sessionId, userId, answer)
            +finish() +syncState(sessionId, userId)
            +recoverTimers()
        }
        class QuestionTimer {
            +schedule(sessionId, closesAt)
            +cancel(sessionId)
        }
        class ImageService {
            +upload(file) string
            +validate(file)
        }
    }

    namespace Dominio {
        class GameStateMachine
        class ScoreCalculator
        class AnswerPolicy
        class SessionCodeGenerator
        class QuizRepository {
            <<interface>>
        }
        class SessionRepository {
            <<interface>>
        }
        class ParticipantRepository {
            <<interface>>
        }
        class AnswerRepository {
            <<interface>>
            +insertIfAbsent(answer) bool
        }
        class ResultRepository {
            <<interface>>
        }
        class ImageStorage {
            <<interface>>
            +save() +delete() +urlFor()
        }
        class Clock {
            <<interface>>
        }
    }

    namespace Datos {
        class PgQuizRepository
        class PgSessionRepository
        class PgParticipantRepository
        class PgAnswerRepository
        class PgResultRepository
        class DiskImageStorage
        class SupabaseImageStorage
        class SystemClock
    }

    QuizzesController --> QuizService
    QuizzesController --> ImageService
    SessionsController --> SessionService
    GameGateway --> GameService
    QuizzesController ..> JwtAuthGuard
    SessionsController ..> JwtAuthGuard
    GameGateway ..> WsAuthGuard

    QuizService --> QuizRepository
    SessionService --> QuizRepository
    SessionService --> SessionRepository
    SessionService --> ParticipantRepository
    SessionService --> SessionCodeGenerator
    GameService --> GameStateMachine
    GameService --> AnswerPolicy
    GameService --> ScoreCalculator
    GameService --> SessionRepository
    GameService --> ParticipantRepository
    GameService --> AnswerRepository
    GameService --> ResultRepository
    GameService --> QuestionTimer
    GameService --> Clock
    ImageService --> ImageStorage

    PgQuizRepository ..|> QuizRepository
    PgSessionRepository ..|> SessionRepository
    PgParticipantRepository ..|> ParticipantRepository
    PgAnswerRepository ..|> AnswerRepository
    PgResultRepository ..|> ResultRepository
    DiskImageStorage ..|> ImageStorage
    SupabaseImageStorage ..|> ImageStorage
    SystemClock ..|> Clock
```

Notas:
- `GameService.submitAnswer` valida con `AnswerPolicy`, calcula con `ScoreCalculator`, y en una transacción hace `AnswerRepository.insertIfAbsent` (`INSERT ... ON CONFLICT DO NOTHING`); solo si insertó suma puntos al participante. Validación y cierre se serializan por sala.
- `GameService.recoverTimers` reprograma los temporizadores al arrancar leyendo `sessions` con `status = 'in_progress'`.
- `SessionService.createSession` genera el código con reintento ante colisión y copia las preguntas a `session_questions`.

## 3. Servicio de autenticación (auth-api)

```mermaid
classDiagram
    direction TB

    class Profile {
        +UUID id
        +string email
        +string displayName
        +string passwordHash
        +Date createdAt
        +verifyPassword(plain, hasher) bool
    }

    namespace Presentacion {
        class AuthController {
            +register() +login() +me()
        }
        class JwtAuthGuard
    }

    namespace Aplicacion {
        class AuthService {
            +register(email, displayName, password) Profile
            +login(email, password) AccessToken
            +getProfile(id) Profile
        }
        class TokenService {
            +issue(profile) string
            +verify(token) Claims
        }
    }

    namespace Dominio {
        class PasswordHasher {
            <<interface>>
            +hash(plain) string
            +compare(plain, hash) bool
        }
        class ProfileRepository {
            <<interface>>
            +findByEmail(email) Profile
            +findById(id) Profile
            +save(profile) Profile
        }
    }

    namespace Datos {
        class PgProfileRepository
        class ArgonPasswordHasher
    }

    class Claims {
        +UUID sub
        +string aud
        +string displayName
        +Date exp
    }

    AuthController --> AuthService
    AuthController ..> JwtAuthGuard
    AuthService --> ProfileRepository
    AuthService --> PasswordHasher
    AuthService --> TokenService
    AuthService ..> Profile
    TokenService ..> Claims
    PgProfileRepository ..|> ProfileRepository
    ArgonPasswordHasher ..|> PasswordHasher
```

Notas:
- `TokenService.issue` incluye la audiencia de `kahoot-api` en `aud` y el `sub` con el `id` del perfil; `kahoot-api` valida el token sin consultar la base `auth`.
- La unicidad del correo (`citext`) se garantiza en la base; `register` traduce la violación a un error de dominio "correo ya registrado".
- `password_hash` nunca sale de la API: los DTO de respuesta excluyen ese campo.
