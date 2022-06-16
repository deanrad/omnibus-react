import * as React from 'react';

// @ts-ignore
export const Unmounter = ({ above = false, buttonClasses = '', children }) => {
  const [mounted, setMounted] = React.useState(true);
  const content = [
    <p key="_or_unmountable">{children}</p>,
    <p key="_or_unmounter">
      <button
        data-testid="unmounter-button"
        onClick={() => setMounted((m) => !m)}
      >
        {mounted ? 'Unmount' : 'Remount'}
      </button>
    </p>,
  ];
  above && content.reverse();
  return (
    <div>
      {mounted && content}
      {!mounted && (
        <p key="_or_remounter">
          Unmounted!{' '}
          <span>
            <button className={buttonClasses} onClick={() => setMounted(true)}>
              Remount
            </button>
          </span>
        </p>
      )}
    </div>
  );
};
