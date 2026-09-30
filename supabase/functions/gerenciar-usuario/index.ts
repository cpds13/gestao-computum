import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function extrairToken(req: Request) {
  const header = req.headers.get('Authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

async function obterUsuarioAuthPorToken(token: string) {
  // Os tokens atuais do Supabase deste projeto usam assinatura assimétrica
  // ES256. A validação é feita localmente contra o JWKS do projeto através
  // de getClaims(), evitando uma chamada manual ao endpoint /auth/v1/user.
  const { data, error } = await adminClient.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    console.error('Falha ao validar access token:', {
      status: error?.status || 401,
      message: error?.message || 'Token inválido.'
    });
    throw new HttpError('Sessão inválida. Faça login novamente.', 401);
  }

  return {
    id: String(data.claims.sub),
    email: data.claims.email ? String(data.claims.email) : null,
    claims: data.claims
  };
}

async function exigirAdministrador(req: Request) {
  const token = extrairToken(req);
  if (!token) throw new HttpError('Sessão não informada.', 401);

  const authUser = await obterUsuarioAuthPorToken(token);

  const { data: perfil, error: perfilError } = await adminClient
    .from('usuarios')
    .select('id, nome, email, perfil, ativo')
    .eq('id', authUser.id)
    .single();

  if (perfilError || !perfil || !perfil.ativo || perfil.perfil !== 'administrador') {
    throw new HttpError('Acesso restrito ao administrador.', 403);
  }

  return { authUser, perfil };
}

async function aplicarPerfil(
  userId: string,
  nome: string,
  email: string,
  admin: boolean,
  calculista: boolean,
  ativo: boolean,
  calculistaId: string | null = null
) {
  const perfil = admin ? 'administrador' : calculista ? 'calculista' : 'administrativo';

  const { error: usuarioError } = await adminClient
    .from('usuarios')
    .upsert(
      { id: userId, nome, email, perfil, ativo, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (usuarioError) throw usuarioError;

  const { data: vinculado, error: vinculoError } = await adminClient
    .from('calculistas')
    .select('id, nome, ativo')
    .eq('usuario_id', userId)
    .maybeSingle();

  if (vinculoError) throw vinculoError;

  if (calculista) {
    let alvo: any = null;

    if (calculistaId) {
      const { data, error } = await adminClient
        .from('calculistas')
        .select('id, nome, usuario_id, ativo')
        .eq('id', calculistaId)
        .single();

      if (error) throw error;
      if (data.usuario_id && data.usuario_id !== userId) {
        throw new HttpError('O cadastro de calculista escolhido já está vinculado a outro usuário.', 400);
      }
      alvo = data;
    }

    if (!alvo && vinculado) alvo = vinculado;

    if (!alvo) {
      const { data: porNome, error } = await adminClient
        .from('calculistas')
        .select('id, nome, usuario_id, ativo')
        .ilike('nome', nome)
        .maybeSingle();

      if (error) throw error;
      if (porNome?.usuario_id && porNome.usuario_id !== userId) {
        throw new HttpError('Já existe um calculista com esse nome vinculado a outro usuário.', 400);
      }
      alvo = porNome;
    }

    if (alvo) {
      const { error } = await adminClient
        .from('calculistas')
        .update({ usuario_id: userId, nome, ativo: true, updated_at: new Date().toISOString() })
        .eq('id', alvo.id);

      if (error) throw error;

      if (vinculado && vinculado.id !== alvo.id) {
        const { error: unlinkError } = await adminClient
          .from('calculistas')
          .update({ usuario_id: null, updated_at: new Date().toISOString() })
          .eq('id', vinculado.id);

        if (unlinkError) throw unlinkError;
      }
    } else {
      const { error } = await adminClient
        .from('calculistas')
        .insert({ nome, usuario_id: userId, ativo: true });

      if (error) throw error;
    }
  } else if (vinculado) {
    const { error } = await adminClient
      .from('calculistas')
      .update({ usuario_id: null, updated_at: new Date().toISOString() })
      .eq('id', vinculado.id);

    if (error) throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    await exigirAdministrador(req);

    if (req.method !== 'POST') {
      throw new HttpError('Método não permitido.', 405);
    }

    const body = await req.json();
    const action = body?.action;

    if (action === 'create') {
      const nome = String(body.nome || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const admin = body.admin === true;
      const calculista = body.calculista === true;
      const calculistaId = String(body.calculista_id || '').trim() || null;
      const ativo = body.ativo !== false;

      if (!nome || !email || password.length < 8) {
        throw new HttpError('Informe nome, e-mail e uma senha inicial com pelo menos 8 caracteres.', 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: nome, display_name: nome }
      });

      if (createError) throw new HttpError(createError.message, 400);

      try {
        await aplicarPerfil(created.user.id, nome, email, admin, calculista, ativo, calculistaId);
      } catch (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        throw profileError;
      }

      if (!ativo) {
        await adminClient.auth.admin.updateUserById(created.user.id, { ban_duration: '876000h' });
      }

      return json({ ok: true, user_id: created.user.id });
    }

    if (action === 'update') {
      const userId = String(body.user_id || '').trim();
      const nome = String(body.nome || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const admin = body.admin === true;
      const calculista = body.calculista === true;
      const calculistaId = String(body.calculista_id || '').trim() || null;
      const ativo = body.ativo !== false;

      if (!userId || !nome || !email) {
        throw new HttpError('Nome, e-mail e usuário são obrigatórios.', 400);
      }

      const { data: alvoAtual, error: alvoError } = await adminClient
        .from('usuarios')
        .select('id, perfil, ativo')
        .eq('id', userId)
        .single();

      if (alvoError) throw alvoError;

      if (alvoAtual?.perfil === 'administrador' && (!admin || !ativo)) {
        const { count, error: countError } = await adminClient
          .from('usuarios')
          .select('id', { count: 'exact', head: true })
          .eq('perfil', 'administrador')
          .eq('ativo', true);

        if (countError) throw countError;
        if ((count || 0) <= 1) {
          throw new HttpError('O sistema precisa manter pelo menos um administrador ativo.', 400);
        }
      }

      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        user_metadata: { name: nome, display_name: nome },
        ban_duration: ativo ? 'none' : '876000h'
      });

      if (authError) throw new HttpError(authError.message, 400);

      await aplicarPerfil(userId, nome, email, admin, calculista, ativo, calculistaId);
      return json({ ok: true });
    }

    if (action === 'ensure-profile') {
      const userId = String(body.user_id || '').trim();
      if (!userId) throw new HttpError('Usuário não informado.', 400);

      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
      if (authError || !authUser.user) throw new HttpError('Usuário não encontrado no Auth.', 404);

      const nome = String(
        authUser.user.user_metadata?.name ||
        authUser.user.user_metadata?.display_name ||
        authUser.user.email ||
        ''
      ).trim();
      const email = String(authUser.user.email || '').trim().toLowerCase();

      await aplicarPerfil(userId, nome, email, false, false, true);
      return json({ ok: true });
    }

    throw new HttpError('Ação não reconhecida.', 400);
  } catch (error: any) {
    console.error(error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return json({ error: error?.message || 'Erro interno.' }, status);
  }
});
