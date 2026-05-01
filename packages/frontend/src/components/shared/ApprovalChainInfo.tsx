import { useState } from 'react';

interface ApprovalChainInfoProps {
  roleDescription: string;
}

export function ApprovalChainInfo({ roleDescription }: ApprovalChainInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: '13px', color: '#3C3C43', margin: 0 }}>
            {roleDescription}
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: '#0071E3',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ⓘ Kako funkcionira odobrenje?
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
              border: '1px solid #E8E8ED',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E8E8ED',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>
                Kako funkcionira odobrenje?
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  border: '1px solid #D2D2D7',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: '#3C3C43',
                  cursor: 'pointer',
                }}
              >
                Zatvori
              </button>
            </div>
            <div style={{ padding: '18px 24px 22px' }}>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#3C3C43', fontSize: '14px', lineHeight: 1.9 }}>
                <li>≤ €1.000: AM</li>
                <li>€1.001 – €3.000: AM → D → C2</li>
                <li>&gt; €3.000: AM → D → C2 → BOD</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
