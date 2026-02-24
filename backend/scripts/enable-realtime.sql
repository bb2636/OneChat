-- Supabase Realtime 활성화를 위한 SQL 스크립트
-- Supabase 대시보드 > SQL Editor에서 실행하거나
-- psql을 통해 직접 실행

-- 1. users 테이블에 대한 Realtime 활성화
-- Supabase 대시보드에서도 가능: Database > Replication > users 테이블 > Enable Realtime

-- Realtime을 활성화하려면 Supabase 대시보드에서:
-- Database > Replication > users 테이블 찾기 > Enable Realtime 토글 활성화

-- 또는 SQL로 직접 활성화:
-- publication에 테이블 추가 (Supabase가 자동으로 관리하지만 필요시)
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- 2. Row Level Security (RLS) 정책 설정 (선택사항)
-- 보안을 위해 위치 정보 접근 권한 제어

-- 모든 사용자가 다른 사용자의 위치 정보를 읽을 수 있도록 설정
CREATE POLICY "Users can read other users' locations"
ON users FOR SELECT
USING (true);

-- 사용자는 자신의 위치만 업데이트할 수 있도록 설정
-- (실제로는 애플리케이션 레벨에서 userId로 필터링하므로 선택사항)
CREATE POLICY "Users can update own location"
ON users FOR UPDATE
USING (true); -- 애플리케이션에서 userId로 필터링하므로 모든 업데이트 허용

-- 3. 위치 업데이트를 위한 인덱스 확인 (이미 Prisma 스키마에 포함됨)
-- CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);

-- 4. 위치 업데이트 시간을 자동으로 갱신하는 트리거 (선택사항)
CREATE OR REPLACE FUNCTION update_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.latitude IS DISTINCT FROM NEW.latitude) OR 
     (OLD.longitude IS DISTINCT FROM NEW.longitude) THEN
    NEW.location_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_location_updated_at();

-- 5. Realtime 이벤트 필터링 (선택사항)
-- 특정 컬럼만 Realtime으로 전송하려면:
-- ALTER TABLE users REPLICA IDENTITY FULL;
