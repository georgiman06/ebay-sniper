"""add_api_usage

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-02

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'api_usage',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('service', sa.String(length=50), nullable=False),
        sa.Column('usage_date', sa.Date(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('service', 'usage_date', name='uq_api_usage_service_date'),
    )
    op.create_index(
        'ix_api_usage_service_date',
        'api_usage',
        ['service', 'usage_date'],
        unique=False,
    )


def downgrade():
    op.drop_index('ix_api_usage_service_date', table_name='api_usage')
    op.drop_table('api_usage')
