import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The Monetra server. Set at build time: flutter build apk --dart-define=API_URL=https://...
/// The default reaches `npm run dev` on the Mac from the Android emulator.
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');

/// Thrown for answers the app has to act on; anything else is a [DioException].
class ApiError implements Exception {
  const ApiError(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;
  bool get signedOut => status == 401;
  @override
  String toString() => message;
}

/// True when the request never got an answer: no signal, server down, timeout.
bool isOffline(Object e) =>
    e is DioException &&
    const [DioExceptionType.connectionError, DioExceptionType.connectionTimeout, DioExceptionType.receiveTimeout, DioExceptionType.sendTimeout]
        .contains(e.type);

/// The session token lives in the Android keystore, never in the database.
class TokenStore {
  TokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();
  final FlutterSecureStorage _storage;
  static const _key = 'session_token';
  String? _cached;

  Future<String?> read() async => _cached ??= await _storage.read(key: _key);
  Future<void> write(String token) async {
    _cached = token;
    await _storage.write(key: _key, value: token);
  }

  Future<void> clear() async {
    _cached = null;
    await _storage.delete(key: _key);
  }
}

class Api {
  Api(this.tokens, {Dio? dio}) : _dio = dio ?? Dio(BaseOptions(baseUrl: apiUrl)) {
    _dio.options
      ..connectTimeout = const Duration(seconds: 10)
      ..receiveTimeout = const Duration(seconds: 30)
      ..validateStatus = (_) => true;
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokens.read();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onResponse: (response, handler) async {
        // Better Auth's bearer plugin hands out a (refreshed) token on sign-in and session use.
        final fresh = response.headers.value('set-auth-token');
        if (fresh != null && fresh.isNotEmpty) await tokens.write(fresh);
        handler.next(response);
      },
    ));
  }

  final TokenStore tokens;
  final Dio _dio;

  Map<String, dynamic> _ok(Response<dynamic> r) {
    final data = r.data is Map<String, dynamic> ? r.data as Map<String, dynamic> : <String, dynamic>{};
    if (r.statusCode != null && r.statusCode! >= 200 && r.statusCode! < 300) return data;
    // Monetra's routes answer { error: { code, message } }; Better Auth answers { code, message }.
    final err = (data['error'] as Map<String, dynamic>?) ?? data;
    throw ApiError(r.statusCode ?? 0, (err['code'] ?? 'HTTP_${r.statusCode}') as String,
        (err['message'] ?? 'Something went wrong. Try again.') as String);
  }

  Future<void> signIn(String email, String password) async {
    _ok(await _dio.post('/api/auth/sign-in/email', data: {'email': email, 'password': password}));
  }

  Future<void> signUp(String name, String email, String password, String timezone) async {
    _ok(await _dio.post('/api/auth/sign-up/email', data: {'name': name, 'email': email, 'password': password, 'timezone': timezone}));
  }

  Future<void> requestPasswordReset(String email) async {
    _ok(await _dio.post('/api/auth/request-password-reset', data: {'email': email, 'redirectTo': '/reset-password'}));
  }

  Future<void> changePassword(String current, String next) async {
    _ok(await _dio.post('/api/auth/change-password',
        data: {'currentPassword': current, 'newPassword': next, 'revokeOtherSessions': false}));
  }

  Future<void> updateProfile({String? name, String? timezone}) async {
    _ok(await _dio.post('/api/auth/update-user', data: {'name': ?name, 'timezone': ?timezone}));
  }

  Future<void> signOut() async {
    try {
      await _dio.post('/api/auth/sign-out', data: const <String, dynamic>{});
    } finally {
      await tokens.clear();
    }
  }

  Future<Map<String, dynamic>> push(List<Map<String, dynamic>> mutations) async =>
      _ok(await _dio.post('/api/sync/push', data: {'mutations': mutations}));

  Future<Map<String, dynamic>> pull(String since) async =>
      _ok(await _dio.get('/api/sync/pull', queryParameters: {'since': since}));

  /// The newest APK on the download page, for the update check.
  Future<Map<String, dynamic>> appVersion() async => _ok(await _dio.get('/api/app-version'));
}
