"""unique_search_query

Revision ID: a1b2c3d4e5f6
Revises: fdbb4e9a14e4
Create Date: 2026-04-30

"""
from alembic import op

revision = 'a1b2c3d4e5f6'
down_revision = 'fdbb4e9a14e4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        'uq_tracked_parts_search_query',
        'tracked_parts',
        ['search_query'],
    )


def downgrade():
    op.drop_constraint(
        'uq_tracked_parts_search_query',
        'tracked_parts',
        type_='unique',
    )
