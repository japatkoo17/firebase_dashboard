import PermissionsManager from './permissions-manager';

export default function PermissionsAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Správa Prístupov</h1>
        <p className="text-text-muted">
          Prideľujte používateľom prístup k jednotlivým spoločnostiam.
        </p>
      </div>
      
      <PermissionsManager />
      
    </div>
  );
}
